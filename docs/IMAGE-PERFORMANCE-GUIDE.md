# Image Performance Guide for TrustGambit

## Overview
This guide explains how to use images in questions efficiently for large-scale competitions (300-3000 players).

## ⚠️ Performance Considerations

### The Problem
With 3000 simultaneous players:
- 3000 players × 1 image = **3000 HTTP requests** to your image host
- Large images (e.g., 2MB) = **6GB total bandwidth** per round
- Slow external hosts can delay game loading

### The Solution
We've implemented several optimizations, but **smart image usage is crucial**.

---

## ✅ Best Practices

### 1. **Use Images Sparingly**
- **NOT all questions need images** - only use when it adds value
- Text-only questions load instantly with zero bandwidth
- Reserve images for visual problems (diagrams, charts, maps)

### 2. **Optimize Image Size**
Recommended specifications:
- **Maximum dimensions**: 400×300 pixels
- **File format**: WebP or optimized JPEG/PNG
- **Target file size**: < 50KB per image
- **Good**: 30-50KB optimized image
- **Bad**: 2MB uncompressed photo

### 3. **Use a CDN**
Best hosting options for 3000 concurrent users:
1. **Cloudflare Images** (Recommended)
   - Built-in optimization
   - Global CDN
   - Automatic caching
   - Resize on-the-fly

2. **imgix** or **Cloudinary**
   - Professional image CDN
   - Automatic optimization
   - URL-based transformations

3. **DigitalOcean Spaces CDN**
   - Reliable at scale
   - Edge caching
   - Low cost

❌ **Avoid**: Direct links to shared hosting, personal servers, or unreliable hosts

### 4. **Pre-optimize Images**
Use these free tools before uploading:
- **TinyPNG** (https://tinypng.com/) - PNG/JPEG compression
- **Squoosh** (https://squoosh.app/) - WebP conversion
- **ImageOptim** (Mac app) - Batch optimization

Example optimization:
```
Original: 2.5MB (2400×1800 pixels)
↓
Resize: 400×300 pixels
↓
Compress: WebP format, 80% quality
↓
Result: 35KB (98% smaller, still looks great)
```

---

## 🚀 Technical Optimizations (Already Implemented)

### 1. **Lazy Loading**
```tsx
loading="lazy"  // Browser loads image only when near viewport
```

### 2. **Async Decoding**
```tsx
decoding="async"  // Doesn't block page rendering
```

### 3. **Error Handling**
```tsx
onError={(e) => e.currentTarget.style.display = 'none'}
```
- If image fails to load, it's hidden
- Game continues without interruption

### 4. **Optional by Default**
- `imageUrl` field is optional in schema
- Questions without images have **zero performance impact**
- No HTTP requests for text-only questions

---

## 📊 Performance Comparison

### Scenario 1: No Images (Current)
- **Bandwidth per round**: ~2KB JSON data
- **Load time**: < 100ms
- **Concurrent users**: Unlimited ✅

### Scenario 2: Optimized Images (50KB each)
- **Bandwidth per round**: 50KB per player
- **3000 players**: 150MB total (spread across CDN)
- **Load time**: ~500ms on 4G
- **Concurrent users**: 3000+ ✅

### Scenario 3: Unoptimized Images (2MB each)
- **Bandwidth per round**: 2MB per player
- **3000 players**: 6GB total
- **Load time**: 20+ seconds on 4G
- **Concurrent users**: May crash ❌

---

## 🎯 Recommended Workflow

### For Your 300-Student Competition:

1. **Audit Questions**
   - Which questions truly benefit from images?
   - Can diagrams be simplified to text descriptions?
   - Aim for 20-30% of questions with images, not 100%

2. **Prepare Images**
   ```bash
   # Example: Optimize all images
   1. Create diagrams at 400×300 pixels
   2. Save as PNG
   3. Run through TinyPNG
   4. Convert to WebP (optional but best)
   5. Verify file size < 50KB
   ```

3. **Host on CDN**
   - Upload to Cloudflare Images / imgix / CloudFront
   - Test URLs load quickly
   - Verify CDN caching is enabled

4. **Test at Scale**
   ```bash
   # Simulate 100 concurrent requests
   ab -n 100 -c 100 https://your-cdn.com/image1.webp
   ```

5. **Add to Questions**
   - Paste CDN URLs into admin dashboard
   - Preview to verify
   - Test with multiple dummy players before competition

---

## 🔍 Monitoring During Competition

Watch these metrics:
1. **Image load times** (Browser DevTools → Network tab)
2. **Failed image loads** (check browser console)
3. **Player dashboard load time**
4. **CDN bandwidth usage**

If images slow things down:
- Disable imageUrl for remaining questions
- Game continues normally with text-only questions

---

## 💡 Example: Good vs Bad

### ❌ Bad Practice
```
Question: "What is 2+2?"
Image: https://myserver.com/photos/DSC_0001_FULL_RESOLUTION.JPG
Size: 8MB
Result: 30-second load time, crashed server
```

### ✅ Good Practice
```
Question: "Based on this network diagram, which node is the bottleneck?"
Image: https://cdn.cloudflare.com/trust-gambit/network-diagram-q5.webp
Size: 28KB
Result: < 500ms load time, smooth experience
```

---

## 🧪 Testing Recommendations

Before competition day:

1. **Test with dummy players**
   ```bash
   # You have 3000 dummy players - use them!
   # Open 50 browser tabs to player1-50@test.com
   # Start a round with an image
   # Monitor load times
   ```

2. **Test image failure**
   - Use an invalid URL
   - Verify game continues without error
   - Confirm image silently hides

3. **Test without images**
   - Run a full game with text-only questions
   - Should be instant and flawless

4. **Bandwidth calculation**
   ```
   Total bandwidth = (# images) × (avg size) × (# players)
   Example: 5 images × 40KB × 300 players = 60MB
   ```

---

## 🎓 For Your Competition

**Conservative Approach (Recommended for first run):**
- Use images for 5-10 questions max
- Keep images under 40KB each
- Use Cloudflare or similar CDN
- Test with 50+ dummy players first

**Why this is safe:**
- 10 images × 40KB × 300 players = 120MB total
- Spread over multiple rounds
- CDN caching means second round is instant
- Text questions have zero overhead

---

## 📞 Troubleshooting

**Problem**: Images load slowly
- **Solution**: Reduce image file size, use CDN

**Problem**: Some players can't see images
- **Solution**: Check CDN is accessible, use HTTPS URLs

**Problem**: Game feels slow with images
- **Solution**: Disable imageUrl for future questions, use text only

**Problem**: Image host rate limits us
- **Solution**: Switch to proper CDN, not shared hosting

---

## Summary

✅ **Images are OPTIONAL** - questions work perfectly without them  
✅ **Lazy loading enabled** - minimal performance impact  
✅ **Error handling** - failed images won't break the game  
✅ **Use CDN** - required for 300+ concurrent users  
✅ **Optimize size** - target < 50KB per image  
✅ **Test first** - use dummy players to verify performance  

**Bottom line**: With proper optimization and selective use, images can enhance your competition without performance issues. When in doubt, text-only questions are instant and reliable.
