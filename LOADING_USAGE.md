# Custom Loading Component - Usage Guide

## Overview
The Sahra platform now includes a custom animated loading component featuring a desert tent with a walking stick figure. This component provides visual feedback during async operations.

## Features
- ✅ Animated tent with gentle swaying motion
- ✅ Stick figure character walking out from the tent
- ✅ Smooth CSS animations with reduced motion support
- ✅ Desert-themed background with sun and sand dunes
- ✅ Bilingual support (English/Arabic)
- ✅ Responsive design with size variants
- ✅ Global loading state management via Context API

---

## Installation

The loading system is already integrated into the app via `LoadingProvider` in `App.tsx`.

---

## Basic Usage

### 1. Using the Loading Hook

Import the `useLoading` hook in any component:

```typescript
import { useLoading } from '@/contexts/LoadingContext';

function MyComponent() {
  const { showLoading, hideLoading } = useLoading();

  const handleAsyncOperation = async () => {
    try {
      showLoading('Fetching your bookings...');
      
      // Your async operation
      await fetchBookings();
      
      hideLoading();
    } catch (error) {
      hideLoading();
      // Handle error
    }
  };

  return (
    <button onClick={handleAsyncOperation}>
      Load Data
    </button>
  );
}
```

### 2. Using the Component Directly

You can also use the `CustomLoading` component directly without the context:

```typescript
import CustomLoading from '@/components/CustomLoading';

function MyPage() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      {isLoading && (
        <CustomLoading 
          message="Processing your request..." 
          fullScreen={true}
          size="md"
        />
      )}
      {/* Your content */}
    </div>
  );
}
```

---

## API Reference

### `useLoading()` Hook

Returns an object with the following methods:

| Method | Parameters | Description |
|--------|------------|-------------|
| `showLoading` | `message?: string` | Shows the loading overlay with optional custom message |
| `hideLoading` | none | Hides the loading overlay |
| `isLoading` | boolean | Current loading state |
| `message` | string | Current loading message |

### `CustomLoading` Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | `undefined` | Custom loading message to display |
| `fullScreen` | `boolean` | `true` | Whether to show as full-screen overlay |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the animation |

---

## Real-World Examples

### Example 1: Form Submission

```typescript
import { useLoading } from '@/contexts/LoadingContext';
import { toast } from 'sonner';

function CreateListingForm() {
  const { showLoading, hideLoading } = useLoading();

  const handleSubmit = async (data: FormData) => {
    try {
      showLoading('Creating your camp listing...');
      
      await createListing(data);
      
      hideLoading();
      toast.success('Listing created successfully!');
    } catch (error) {
      hideLoading();
      toast.error('Failed to create listing');
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 2: Data Fetching

```typescript
import { useLoading } from '@/contexts/LoadingContext';
import { useEffect } from 'react';

function BookingsList() {
  const { showLoading, hideLoading } = useLoading();
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      showLoading('Loading your bookings...');
      
      const data = await fetchBookings();
      setBookings(data);
      
      hideLoading();
    } catch (error) {
      hideLoading();
      console.error('Failed to load bookings:', error);
    }
  };

  return <div>...</div>;
}
```

### Example 3: Payment Processing

```typescript
import { useLoading } from '@/contexts/LoadingContext';

function CheckoutButton() {
  const { showLoading, hideLoading } = useLoading();

  const handlePayment = async () => {
    try {
      showLoading('Processing your payment...');
      
      const result = await processPayment();
      
      hideLoading();
      
      if (result.success) {
        navigate('/payment/success');
      } else {
        navigate('/payment/failed');
      }
    } catch (error) {
      hideLoading();
      toast.error('Payment failed');
    }
  };

  return (
    <button onClick={handlePayment}>
      Pay Now
    </button>
  );
}
```

### Example 4: File Upload

```typescript
import { useLoading } from '@/contexts/LoadingContext';

function ImageUploader() {
  const { showLoading, hideLoading } = useLoading();

  const handleUpload = async (files: FileList) => {
    try {
      showLoading('Uploading images...');
      
      for (const file of files) {
        await uploadImage(file);
      }
      
      hideLoading();
      toast.success('Images uploaded successfully!');
    } catch (error) {
      hideLoading();
      toast.error('Upload failed');
    }
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files)} />;
}
```

### Example 5: Inline Loading (Non-Fullscreen)

```typescript
import CustomLoading from '@/components/CustomLoading';

function DataSection() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="p-4">
      {loading ? (
        <CustomLoading 
          message="Loading statistics..." 
          fullScreen={false}
          size="sm"
        />
      ) : (
        <div>Your data here</div>
      )}
    </div>
  );
}
```

---

## Internationalization (i18n)

The loading component supports bilingual messages. Add translations to your i18n file:

```typescript
// In i18n.ts
{
  en: {
    translation: {
      loading: {
        default: 'Loading...',
        bookings: 'Loading your bookings...',
        payment: 'Processing payment...',
        upload: 'Uploading files...',
        creating: 'Creating listing...'
      }
    }
  },
  ar: {
    translation: {
      loading: {
        default: 'جارٍ التحميل...',
        bookings: 'جارٍ تحميل حجوزاتك...',
        payment: 'جارٍ معالجة الدفع...',
        upload: 'جارٍ رفع الملفات...',
        creating: 'جارٍ إنشاء الإعلان...'
      }
    }
  }
}
```

Then use it with the translation key:

```typescript
const { t } = useTranslation();
showLoading(t('loading.bookings'));
```

---

## Accessibility

The component includes:
- ✅ Respects `prefers-reduced-motion` for users with motion sensitivity
- ✅ Semantic HTML structure
- ✅ Proper ARIA labels (can be added if needed)
- ✅ High contrast colors for visibility

---

## Performance Tips

1. **Always hide loading**: Make sure to call `hideLoading()` in both success and error cases
2. **Use try-finally**: Consider using try-finally blocks to ensure loading is hidden
3. **Avoid rapid toggles**: Don't show/hide loading too quickly (causes flashing)

```typescript
// Good pattern
const loadData = async () => {
  try {
    showLoading('Loading...');
    await fetchData();
  } finally {
    hideLoading(); // Always executes
  }
};
```

---

## Customization

To customize the animation or styling:

1. Edit `/workspace/sahra/src/components/CustomLoading.tsx`
2. Modify the CSS animations in the `<style>` tag
3. Adjust colors, sizes, or timing values
4. Update the SVG paths for different tent/character designs

---

## Troubleshooting

**Loading doesn't show:**
- Ensure `LoadingProvider` wraps your app in `App.tsx`
- Check that `showLoading()` is being called

**Loading doesn't hide:**
- Make sure `hideLoading()` is called in all code paths
- Use try-finally blocks for guaranteed cleanup

**Animation is choppy:**
- Check browser performance
- Reduce animation complexity if needed
- Verify no other heavy operations are running

---

## Support

For issues or questions, contact the development team or refer to the main documentation.