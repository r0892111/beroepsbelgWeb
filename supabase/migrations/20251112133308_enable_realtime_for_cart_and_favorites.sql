/*
  # Enable Real-time for Cart and Favorites

  1. Changes
    - Enable real-time updates for `cart_items` table
    - Enable real-time updates for `favorites` table
  
  2. Purpose
    - Allow instant synchronization of cart and favorites across all client sessions
    - Update navigation counters in real-time without page refresh
    - Improve user experience with immediate feedback
*/

ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE favorites;
