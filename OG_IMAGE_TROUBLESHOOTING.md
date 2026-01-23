# Open Graph Image Troubleshooting Guide

If the Open Graph image doesn't show when sharing your homepage, follow these steps:

## Quick Checks

1. **Verify the image file exists**
   - Check that `public/homepage-og-image.png` exists
   - File should be accessible at: `https://beroepsbelg.be/homepage-og-image.png`

2. **Test the image URL directly**
   - Open: `https://beroepsbelg.be/homepage-og-image.png` in your browser
   - If it doesn't load, the file might not be deployed correctly

3. **Check image requirements**
   - **Recommended size**: 1200x630 pixels (1.91:1 ratio)
   - **File size**: Under 8MB (ideally under 1MB)
   - **Format**: PNG or JPG
   - **Must be publicly accessible** (in `public/` folder)

## Debugging Steps

### 1. Verify Metadata in HTML
View page source and check for:
```html
<meta property="og:image" content="https://beroepsbelg.be/homepage-og-image.png">
```

### 2. Test with Social Media Debuggers
- **Facebook Debugger**: https://developers.facebook.com/tools/debug/
- **Twitter Card Validator**: https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector**: https://www.linkedin.com/post-inspector/

Enter your URL (`https://beroepsbelg.be/nl`) and click "Scrape Again" to refresh the cache.

### 3. Clear Social Media Cache
Social platforms cache OG images. After fixing issues:
- Use the debugger tools above to refresh the cache
- Wait 24-48 hours for cache to expire naturally

### 4. Check Image Accessibility
```bash
# Test if image is accessible
curl -I https://beroepsbelg.be/homepage-og-image.png
```

Should return `200 OK` status.

### 5. Verify Environment Variables
If using `NEXT_PUBLIC_SITE_URL`, ensure it's set correctly:
- Production: `https://beroepsbelg.be`
- Staging: Your staging URL
- Local: Not needed (uses fallback)

## Common Issues & Solutions

### Issue: Image shows locally but not in production
**Solution**: 
- Ensure `public/homepage-og-image.png` is committed to git
- Verify deployment includes the `public/` folder
- Check build logs for any errors

### Issue: Image URL is relative instead of absolute
**Solution**: Already handled - the code uses `${BASE_URL}/homepage-og-image.png` which ensures absolute URLs.

### Issue: Image dimensions are wrong
**Solution**:
- Resize image to 1200x630px
- Use image editing software or online tools
- Re-upload to `public/` folder

### Issue: File size too large
**Solution**:
- Compress the image using tools like:
  - TinyPNG: https://tinypng.com/
  - Squoosh: https://squoosh.app/
- Aim for under 1MB file size

### Issue: CORS or access restrictions
**Solution**:
- Ensure image is in `public/` folder (not `app/` or elsewhere)
- Check hosting provider doesn't block image access
- Verify no `.htaccess` or security rules blocking images

## Testing Checklist

- [ ] Image file exists in `public/homepage-og-image.png`
- [ ] Image is accessible via direct URL
- [ ] Image dimensions are 1200x630px (or close)
- [ ] File size is under 8MB
- [ ] Metadata includes absolute URL (not relative)
- [ ] Tested with Facebook Debugger
- [ ] Tested with Twitter Card Validator
- [ ] Cleared social media cache after fixes

## Fallback Image

If `homepage-og-image.png` fails, the system will fall back to `Beroepsbelg Logo.png`. Ensure both images exist in the `public/` folder.

## Need More Help?

If issues persist:
1. Check browser console for errors
2. Check server logs for 404s on image requests
3. Verify Next.js build includes public assets
4. Test with different social platforms to isolate the issue
