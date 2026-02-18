import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
    },
  });
}

async function checkAdminAccess(request: NextRequest): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    let accessToken: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    if (accessToken) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return { isAdmin: false, userId: null };
      }

      const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(accessToken);

      if (authError || !user) {
        return { isAdmin: false, userId: null };
      }

      // Use service role client to check profile (bypasses RLS)
      const supabaseServer = getSupabaseServer();
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('isAdmin, is_admin')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        return { isAdmin: false, userId: user.id };
      }

      const isAdmin = profile.isAdmin === true || profile.is_admin === true;
      return { isAdmin, userId: user.id };
    }

    return { isAdmin: false, userId: null };
  } catch (error) {
    return { isAdmin: false, userId: null };
  }
}

// GET - Get single order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { orderId } = await params;
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from('stripe_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }
      console.error('Failed to fetch order:', error);
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data });
  } catch (error: any) {
    console.error('Error in GET /api/admin/orders/[orderId]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PUT - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { orderId } = await params;
    const body = await request.json();
    const supabase = getSupabaseServer();

    // Check if order exists and get full order data
    const { data: existingOrder, error: checkError } = await supabase
      .from('stripe_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is being marked as paid and completed
    const isBeingMarkedAsPaid = body.payment_status === 'paid' && existingOrder.payment_status !== 'paid';
    const isBeingMarkedAsCompleted = body.status === 'completed' && existingOrder.status !== 'completed';
    const shouldCreateStoqflowOrder = (isBeingMarkedAsPaid || isBeingMarkedAsCompleted) && !existingOrder.stoqflow_order_id;

    // Prepare update object (only include fields that are provided)
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) updates.status = body.status;
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    if (body.customer_name !== undefined) updates.customer_name = body.customer_name;
    if (body.customer_email !== undefined) updates.customer_email = body.customer_email;
    if (body.customer_phone !== undefined) updates.customer_phone = body.customer_phone;
    if (body.shipping_address !== undefined) updates.shipping_address = body.shipping_address;
    if (body.billing_address !== undefined) updates.billing_address = body.billing_address;
    if (body.items !== undefined) updates.items = body.items;
    if (body.metadata !== undefined) updates.metadata = body.metadata;
    if (body.amount_subtotal !== undefined) updates.amount_subtotal = body.amount_subtotal;
    if (body.amount_total !== undefined) updates.amount_total = body.amount_total;
    if (body.total_amount !== undefined) updates.total_amount = body.total_amount;
    if (body.currency !== undefined) updates.currency = body.currency;
    if (body.stoqflow_order_id !== undefined) updates.stoqflow_order_id = body.stoqflow_order_id;

    const { data, error } = await supabase
      .from('stripe_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to update order' },
        { status: 500 }
      );
    }

    // Create Stoqflow order if order is being marked as paid/completed
    if (shouldCreateStoqflowOrder && data.items && Array.isArray(data.items) && data.items.length > 0) {
      try {
        const stoqflowClientId = process.env.STOQFLOW_CLIENT_ID;
        const stoqflowClientSecret = process.env.STOQFLOW_CLIENT_SECRET;
        const stoqflowShopId = process.env.STOQFLOW_SHOP_ID;
        const stoqflowBaseUrl = process.env.STOQFLOW_BASE_URL;

        if (stoqflowClientId && stoqflowClientSecret && stoqflowShopId && stoqflowBaseUrl) {
          console.info('[Stoqflow] Creating order in Stoqflow for manually paid order');

          const credentials = `${stoqflowClientId}:${stoqflowClientSecret}`;
          const basicAuth = Buffer.from(credentials).toString('base64');
          const apiBaseUrl = `${stoqflowBaseUrl}/api/v2`;

          // Helper function to lookup product in webshop_data by UUID to get Stoqflow ID
          const lookupProductInDatabase = async (productUuid: string): Promise<string | null> => {
            try {
              const { data: product, error } = await supabase
                .from('webshop_data')
                .select('stoqflow_id, uuid')
                .eq('uuid', productUuid)
                .single();
              
              if (!error && product?.stoqflow_id) {
                console.info(`[Stoqflow] Found Stoqflow ID in database: ${product.stoqflow_id} for UUID: ${productUuid}`);
                return product.stoqflow_id;
              }
            } catch (err: any) {
              console.warn(`[Stoqflow] Error looking up product in database:`, err.message);
            }
            return null;
          };

          // Build Stoqflow order items
          const stoqflowOrderItems: any[] = [];
          const orderItems = data.items || [];
          
          for (const item of orderItems) {
            // Skip shipping items
            if (item.title?.toLowerCase().includes('verzendkosten') ||
                item.title?.toLowerCase().includes('shipping') ||
                item.title?.toLowerCase().includes('freight')) {
              continue;
            }

            const productId = item.productId;
            if (!productId) {
              console.warn('[Stoqflow] Skipping item without productId:', item);
              continue;
            }

            // Check if productId looks like a Stoqflow ID (base58 format)
            const looksLikeStoqflowId = /^[23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{15,20}$/.test(productId);
            
            if (looksLikeStoqflowId) {
              stoqflowOrderItems.push({
                product_id: productId,
                quantity: item.quantity || 1,
              });
            } else {
              // Look up Stoqflow ID from database
              const stoqflowProductId = await lookupProductInDatabase(productId);
              if (stoqflowProductId) {
                stoqflowOrderItems.push({
                  product_id: stoqflowProductId,
                  quantity: item.quantity || 1,
                });
              } else {
                console.warn(`[Stoqflow] Product not found for UUID ${productId}, skipping item`);
              }
            }
          }

          if (stoqflowOrderItems.length > 0) {
            // Prepare client_info from shipping address
            const shippingAddress = data.shipping_address as any;
            const clientInfo: any = {
              name: data.customer_name || 'Guest',
              email: data.customer_email || '',
              country: shippingAddress?.country || 'BE',
            };

            if (shippingAddress) {
              clientInfo.address_1 = shippingAddress.street || '';
              clientInfo.city = shippingAddress.city || '';
              clientInfo.postal_code = shippingAddress.postalCode || '';
            }

            // Prepare notes
            const notesText = `Manual Order: ${orderId} | Customer: ${data.customer_email}`;
            const notes = notesText.length > 500 ? notesText.substring(0, 497) + '...' : notesText;

            // Create Stoqflow order payload
            const stoqflowPayload: any = {
              shop_id: stoqflowShopId,
              order_items: stoqflowOrderItems,
              status: 'ready-to-pick',
              type_of_goods: 'commercial-goods',
              origin: {
                id: data.checkout_session_id || `manual_${orderId}`,
                number: orderId.toString(),
              },
              notes: notes,
            };

            const stoqflowOrderClientId = process.env.STOQFLOW_ORDER_CLIENT_ID;
            if (stoqflowOrderClientId) {
              stoqflowPayload.client_id = stoqflowOrderClientId;
            } else {
              stoqflowPayload.client_info = clientInfo;
            }

            // Create order in Stoqflow
            const stoqflowRes = await fetch(`${apiBaseUrl}/orders`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
              },
              body: JSON.stringify(stoqflowPayload),
            });

            if (stoqflowRes.ok) {
              const stoqflowData = await stoqflowRes.json();
              const stoqflowOrderId = stoqflowData._id;
              
              console.info('[Stoqflow] Order created successfully:', {
                stoqflow_order_id: stoqflowOrderId,
                order_id: orderId,
              });

              // Update order with Stoqflow order ID
              await supabase
                .from('stripe_orders')
                .update({ 
                  stoqflow_order_id: stoqflowOrderId,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', orderId);

              // Update the returned data
              data.stoqflow_order_id = stoqflowOrderId;
            } else {
              const errorText = await stoqflowRes.text();
              console.error('[Stoqflow] Failed to create order:', {
                status: stoqflowRes.status,
                error: errorText,
              });
              // Don't fail the order update if Stoqflow fails
            }
          } else {
            console.warn('[Stoqflow] No valid order items found, skipping Stoqflow order creation');
          }
        } else {
          console.warn('[Stoqflow] Missing environment variables, skipping Stoqflow order creation');
        }
      } catch (stoqflowError: any) {
        console.error('[Stoqflow] Error creating order:', stoqflowError);
        // Don't fail the order update if Stoqflow fails
      }
    }

    return NextResponse.json({ order: data });
  } catch (error: any) {
    console.error('Error in PUT /api/admin/orders/[orderId]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE - Delete order (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { isAdmin } = await checkAdminAccess(request);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const { orderId } = await params;
    const supabase = getSupabaseServer();

    // Check if order exists
    const { data: existingOrder, error: checkError } = await supabase
      .from('stripe_orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (checkError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting deleted_at
    const { data, error } = await supabase
      .from('stripe_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Failed to delete order:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to delete order' },
        { status: 500 }
      );
    }

    return NextResponse.json({ order: data, message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/orders/[orderId]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete order' },
      { status: 500 }
    );
  }
}
