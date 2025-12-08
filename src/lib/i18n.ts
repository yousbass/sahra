import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Loading messages
      loading: {
        default: 'Loading...',
        bookings: 'Loading your bookings...',
        payment: 'Processing payment...',
        upload: 'Uploading files...',
        creating: 'Creating listing...',
        updating: 'Updating...',
        deleting: 'Deleting...',
        fetching: 'Fetching data...',
        processing: 'Processing...'
      },
      
      // NotFound page
      notFound: {
        title: '404',
        heading: 'Page Not Found',
        description: "The page you're looking for doesn't exist or may have been moved.",
        returnHome: 'Return Home',
        goBack: 'Go Back'
      },
      
      // Listing Type
      listingType: {
        sectionTitle: 'Choose Listing Type',
        sectionDescription: 'Select the type of listing you want to view',
        camp: {
          title: 'Camp',
          description: 'Desert camping experience with tents',
          badge: 'Camp',
          features: 'Tents, desert activities, traditional camping'
        },
        kashta: {
          title: 'Kashta',
          description: 'Beachfront sitting area by the sea',
          badge: 'Kashta',
          features: 'Beach access, water activities, sea views',
          nameLabel: 'Kashta Name'
        },
        all: 'All Listings',
        selectType: 'Select Listing Type'
      },
      
      // Kashta specific
      kashta: {
        seatingCapacity: '{{count}} seats',
        beachfront: 'Beachfront',
        shade: {
          tent: 'Tent Shade',
          umbrella: 'Beach Umbrella',
          pergola: 'Pergola',
          natural: 'Natural Shade'
        },
        view: {
          sea: 'Sea View',
          beach: 'Beach View',
          mixed: 'Mixed View'
        },
        activities: {
          swimming: 'Swimming',
          fishing: 'Fishing',
          snorkeling: 'Snorkeling',
          boating: 'Boating'
        },
        form: {
          seatingCapacity: 'Seating Capacity',
          seatingCapacityPlaceholder: 'Number of people',
          seatingCapacityHelper: 'Maximum number of people for the sitting area',
          beachfrontAccess: 'Direct Beachfront Access',
          beachfrontAccessHelper: 'Does this kashta have direct access to the beach?',
          shadeType: 'Shade Type',
          shadeTypePlaceholder: 'Select shade type',
          viewType: 'View Type',
          amenities: 'Kashta Amenities',
          waterActivities: 'Water Activities'
        }
      },
      
      // Amenity Categories
        kashtaDescription: 'Description',
        kashtaDescriptionPlaceholder: 'Describe your kashta...',
      amenityCategories: {
        essential: 'Essential',
        comfort: 'Comfort',
        cooking: 'Cooking',
        entertainment: 'Entertainment',
        activities: 'Activities',
        seating: 'Seating',
        other: 'Other'
      },
      
      // Auth - Sign In page
      auth: {
        welcomeBack: 'Welcome Back',
        signInSubtitle: 'Sign in to access your account',
        email: 'Email Address',
        password: 'Password',
        forgot: 'Forgot Password?',
        signIn: 'Sign In',
        signingIn: 'Signing in...',
        sending: 'Sending...',
        orContinue: 'Or continue with',
        google: 'Continue with Google',
        noAccount: "Don't have an account?",
        signUp: 'Sign Up',
        enterEmailFirst: 'Please enter your email first'
      },
      
      // Auth - Sign Up page
      authSignUp: {
        join: 'Join Sahra',
        subtitle: 'Create your account to start booking',
        fullName: 'Full Name',
        email: 'Email Address',
        password: 'Password',
        passwordHint: 'At least 6 characters',
        createAccount: 'Create Account',
        creating: 'Creating account...',
        orContinue: 'Or continue with',
        google: 'Continue with Google',
        haveAccount: 'Already have an account?',
        signIn: 'Sign In'
      },
      
      // Bookings User page
      bookingsUser: {
        title: 'My Bookings',
        count: '{{count}} bookings',
        current: 'Current',
        past: 'Past',
        emptyTitle: 'No bookings yet',
        emptyDesc: 'Start exploring and book your perfect camping spot!',
        viewDetails: 'View Details',
        payNow: 'Pay Now',
        cancel: 'Cancel Booking',
        writeReview: 'Write Review',
        statusTitle: 'Booking Status',
        statusDesc: 'Current reservation status'
      },
      
      // Camp Details page
      campDetails: {
        loading: 'Loading camp details...',
        notFound: 'Camp not found',
        back: 'Back to Search',
        backToSearch: 'Back to Search',
        pendingApproval: 'This listing is pending approval',
        overview: 'Overview',
        about: 'About this camp',
        amenities: 'Amenities',
        reviews: 'Reviews',
        campHours: 'Camp Hours',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        nextDay: 'next day',
        fullDayHint: 'Full day experience from morning to next day',
        maxGuests: 'Max Guests',
        totalTents: 'Total Tents',
        pricePerDay: 'per day',
        reserveNow: 'Reserve Now',
        cancellationPolicy: 'Cancellation Policy',
        refundNote: 'Free cancellation within policy terms',
        writeReview: 'Write a Review',
        reviewDialog: 'Share your experience',
        reviewSuccess: 'Thank you for your review!',
        signInReview: 'Please sign in to write a review',
        loadCampFailed: 'Failed to load camp details',
        accommodates: 'Accommodates',
        tentsLabel: 'Tents',
        tentDetails: 'Tent Details',
        tentTypes: {
          small: 'Small Tent',
          large: 'Large Tent',
          entertainment: 'Entertainment Tent',
          generic: 'Generic Tent'
        },
        tentFeatures: {
          count: '{{count}} tents',
          none: 'No features specified',
          noDetails: 'No details available',
          furnished: 'Furnished',
          carpeted: 'Carpeted',
          sofas: 'Sofas',
          teaSets: 'Tea Sets',
          tv: 'TV',
          airHockey: 'Air Hockey Table',
          foosball: 'Foosball Table',
          pingPong: 'Ping Pong Table',
          football: 'Football Field',
          volleyball: 'Volleyball Field'
        },
        policy: {
          flexible: {
            name: 'Flexible',
            description: 'Full refund if cancelled 24+ hours before check-in',
            detail1: '24+ hours before check-in',
            detail1Note: 'Full refund (minus service fee)',
            detail2: 'Less than 24 hours',
            detail2Note: 'No refund'
          },
          moderate: {
            name: 'Moderate',
            description: '50% refund if cancelled 48+ hours before check-in',
            detail1: '48+ hours before check-in',
            detail1Note: '50% refund',
            detail2: 'Less than 48 hours',
            detail2Note: 'No refund'
          },
          strict: {
            name: 'Strict',
            description: '50% refund if cancelled 7+ days before check-in',
            detail1: '7+ days before check-in',
            detail1Note: '50% refund',
            detail2: 'Less than 7 days',
            detail2Note: 'No refund'
          }
        }
      },
      
      // Cancellation Policy Selector
      cancelSelector: {
        title: 'Cancellation Policy',
        subtitle: 'Choose how flexible you want to be with cancellations',
        mostPopular: 'Most Popular',
        flexible: {
          name: 'Flexible',
          line1: 'Full refund if cancelled 24 hours before check-in',
          line2: '50% refund if cancelled within 24 hours'
        },
        moderate: {
          name: 'Moderate',
          line1: 'Full refund if cancelled 5 days before check-in',
          line2: '50% refund if cancelled 2-5 days before'
        },
        strict: {
          name: 'Strict',
          line1: 'Full refund if cancelled 7 days before check-in',
          line2: 'No refund if cancelled within 7 days'
        }
      },
      
      // Create Listing page
      createListing: {
        title: 'Create New Listing',
        subtitle: 'Share your camping space with travelers',
        signInRequired: 'Please sign in to create a listing',
        hostRequired: 'You need to be a host to create listings',
        selectType: 'Select Listing Type',
        typeLockedWarning: 'Listing type cannot be changed after you start filling the form',
        campDetails: 'Camp Details',
        kashtaDetails: 'Kashta Details',
        basicInfo: 'Basic Information',
        campName: 'Camp Name',
        campLocation: 'Camp Location',
        campArea: 'Camp Area',
        campAreaPlaceholder: 'e.g., Al-Qarra, Northern Region',
        description: 'Description',
        descriptionPlaceholder: 'Describe your camping space, what makes it special, nearby attractions...',
        
        capacity: {
          title: 'Capacity & Tents',
          maxGuestsHelper: 'Maximum number of guests your camp can accommodate',
          areaHelper: 'Total area available for camping activities'
        },
        
        capacityTents: 'Capacity & Tents',
        maxGuests: 'Maximum Guests',
        maxGuestsPlaceholder: 'e.g., 20',
        
        tents: {
          sectionTitle: 'Tent Configuration',
          largeLabel: 'Large Tents',
          smallLabel: 'Small Tents',
          entertainmentLabel: 'Entertainment Tents',
          genericLabel: 'Generic Tents',
          none: 'None',
          addLarge: 'Add Large Tent',
          addSmall: 'Add Small Tent',
          addEntertainment: 'Add Entertainment Tent',
          descriptionLabel: 'Description',
          descriptionPlaceholder: 'Describe this tent...',
          featuresTitle: 'Features',
          featureLabels: {
            furnished: 'Furnished',
            carpeted: 'Carpeted',
            sofas: 'Sofas',
            teaSets: 'Tea Sets',
            tv: 'TV',
            airHockeyTable: 'Air Hockey Table',
            foosballTable: 'Foosball Table',
            pingPongTable: 'Ping Pong Table',
            footballField: 'Football Field',
            volleyballField: 'Volleyball Field'
          },
          helper: 'Add tents to your camp'
        },
        
        times: {
          helper: 'Set your check-in and check-out times',
          checkInHelper: 'When guests can arrive',
          checkOutHelper: 'When guests should leave (next day)'
        },
        
        checkIn: 'Check-in Time',
        checkOut: 'Check-out Time',
        nextDay: 'next day',
        
        pricing: {
          perDay: 'Price per Day',
          helper: 'Set your daily rate in BHD'
        },
        
        price: 'Price per Day (BHD)',
        pricePlaceholder: 'e.g., 50',
        
        selectLocation: 'Select Location',
        searchLocations: 'Search locations...',
        useMyLocation: 'Use My Current Location',
        gettingLocation: 'Getting your location...',
        locationCaptured: 'Location captured!',
        locationFailed: 'Failed to get location',
        geoUnsupported: 'Geolocation is not supported by your browser',
        googleMapsUrl: 'Google Maps URL',
        locationHelper: 'Set the location of your camp',
        locationRequired: 'Location is required',
        noLocation: 'No location set',
        or: 'or',
        
        map: {
          chooseMethod: 'Choose a method to set location',
          pasteLink: 'Paste Google Maps Link',
          pasteHelper: 'Paste a Google Maps share link here',
          setCoordinates: 'Set Coordinates',
          locationSet: 'Location set successfully',
          fullDay: 'Full day camping experience',
          coordinates: 'Coordinates',
          parseError: 'Failed to parse coordinates'
        },
        
        photosTitle: 'Photos',
        photosHelper: 'Add photos of your camp (at least 3 photos)',
        
        amenitiesSection: 'Amenities',
        amenitiesHelper: 'Select all amenities available at your camp',
        selectedAmenities: 'Selected Amenities',
        
        amenityCategories: {
          essential: 'Essential',
          comfort: 'Comfort',
          cooking: 'Cooking',
          entertainment: 'Entertainment',
          activities: 'Activities',
          other: 'Other'
        },
        
        amenityItems: {
          'Restrooms': 'Restrooms',
          'Kitchen': 'Kitchen',
          'Electricity': 'Electricity',
          'Lighting': 'Lighting',
          'Water Supply': 'Water Supply',
          'Fire Pit': 'Fire Pit',
          'BBQ Grill': 'BBQ Grill',
          'Cooking Equipment': 'Cooking Equipment',
          'Dining Area': 'Dining Area',
          'Sound System': 'Sound System',
          'TV Available': 'TV Available',
          'Volleyball Court': 'Volleyball Court',
          'Soccer Court': 'Soccer Court',
          'Bouncy Castle': 'Bouncy Castle',
          'Furnished Tents': 'Furnished Tents',
          'Carpeted Tents': 'Carpeted Tents',
          'Sofas & Seating': 'Sofas & Seating',
          'Tea Sets': 'Tea Sets',
          'Air Conditioning': 'Air Conditioning',
          'Dune Buggies': 'Dune Buggies',
          'Desert Tours': 'Desert Tours',
          'Camel Rides': 'Camel Rides',
          'Stargazing Area': 'Stargazing Area',
          'Biking': 'Biking',
          'Parking': 'Parking',
          'Pet Friendly': 'Pet Friendly',
          'Family Friendly': 'Family Friendly',
          'Security/Guards': 'Security/Guards',
          'Food Truck Access': 'Food Truck Access'
        },
        
        featuresRules: 'Features & Rules',
        specialFeatures: 'Special Features',
        rules: 'Camp Rules',
        
        sections: {
          details: 'Details'
        },
        
        createListing: 'Create Listing',
        submitting: 'Creating listing...',
        updateFail: 'Failed to update listing'
      },
      
      // Edit Listing page
      editListing: {
        title: 'Edit Listing',
        subtitle: 'Update your camp listing',
        loading: 'Loading listing...',
        signInRequired: 'Please sign in to edit listings',
        hostRequired: 'You need to be a host to edit listings',
        invalidId: 'Invalid listing ID',
        notFound: 'Listing not found',
        noPermission: 'You do not have permission to edit this listing',
        back: 'Back to My Listings',
        saveChanges: 'Save Changes',
        saving: 'Saving changes...',
        success: 'Listing updated successfully!',
        cancelConfirm: 'Discard changes?',
        
        map: {
          geoUnsupported: 'Geolocation is not supported',
          unableLocation: 'Unable to get location',
          parseError: 'Failed to parse coordinates'
        },
        
        validations: {
          locationRequired: 'Please set a location for your camp',
          coordinatesRequired: 'Location coordinates are required',
          maxGuests: 'Maximum guests must be at least 1',
          tents: 'Please add at least one tent',
          images: 'Please add at least 3 photos',
          uploading: 'Please wait for images to finish uploading'
        }
      },
      
      // Filters
      filters: {
        location: 'Location',
        bookingDate: 'Booking Date',
        selectDate: 'Select a date',
        clearDate: 'Clear date',
        findAvailable: 'Find available camps',
        priceRange: 'Price Range',
        up: 'Up to',
        minGuests: 'Min. Guests',
        tentTypes: 'Tent Types',
        largeTents: 'Large Tents',
        smallTents: 'Small Tents',
        entertainmentTents: 'Entertainment Tents',
        amenities: 'Amenities',
        minRating: 'Minimum Rating',
        allRatings: 'All Ratings',
        apply: 'Apply Filters',
        reset: 'Reset',
        listingType: 'Listing Type',
        allTypes: 'All Types'
      },
      
      // Header
      header: {
        brand: 'Sahra',
        admin: 'Admin',
        profile: 'Profile',
        signOut: 'Sign Out',
        signIn: 'Sign In',
        signUp: 'Sign Up'
      },
      
      // Navigation
      nav: {
        search: 'Search',
        bookings: 'Bookings',
        host: 'Host',
        profile: 'Profile'
      },
      
      // Home page
      home: {
        heroTitleTop: 'Discover Your Perfect',
        heroTitleBottom: 'Desert Camping Experience',
        heroSubtitle: 'Book unique camping spots across Bahrain',
        searchPlaceholder: 'Search by location...',
        datePlaceholder: 'Select date',
        searchButton: 'Search',
        filters: 'Filters',
        sortBy: 'Sort by',
        sortNewest: 'Newest',
        sortPriceAsc: 'Price: Low to High',
        sortPriceDesc: 'Price: High to Low',
        sortRating: 'Highest Rated',
        loadingCamps: 'Loading camps...',
        noCampsTitle: 'No camps found',
        noCampsGeneral: 'Try adjusting your filters or search criteria',
        noCampsDate: 'No camps available for the selected date',
        perDay: 'per day',
        viewDetails: 'View Details',
        datePickedLabel: 'Date selected',
        clear: 'Clear',
        clearAll: 'Clear All',
        checkingAvailability: 'Checking availability...',
        availabilityHint: 'Select a date to check availability',
        campsAvailable: '{{count}} camps available',
        filterApplied: '{{count}} filters applied',
        reviewCount: '{{count}} reviews',
        upToGuests: 'Up to {{count}} guests',
        tentsCount: '{{count}} tents'
      },
      
      // Host Dashboard
      host: {
        heroTitle: 'Host Dashboard',
        heroDesc: 'Manage your listings and bookings',
        heroCreate: 'Create New Listing',
        heroManage: 'Manage Listings',
        dashboardTitle: 'Welcome back!',
        dashboardSubtitle: 'Manage your camping business',
        createTitle: 'Create New Listing',
        createDesc: 'Share your camping space',
        manageTitle: 'My Listings',
        manageDesc: 'Edit and manage your camps',
        bookingsTitle: 'Bookings',
        bookingsCount: '{{count}} bookings',
        bookingsCardTitle: 'Recent Bookings',
        bookingsCardDesc: 'View and manage reservations',
        analyticsTitle: 'Analytics',
        analyticsDesc: 'Track your performance',
        back: 'Back to Dashboard',
        noBookings: 'No bookings yet',
        noBookingsHint: 'Your bookings will appear here',
        refresh: 'Refresh'
      },
      
      // Host Cancellation
      hostCancellation: {
        title: 'Cancel Booking',
        description: 'Cancel this booking and process refund',
        bookingDetails: 'Booking Details',
        camp: 'Camp',
        guest: 'Guest',
        guests: 'Guests',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        bookingAmount: 'Booking Amount',
        importantNotice: 'Important Notice',
        importantDesc: 'Cancelling this booking may result in penalties',
        hostPenalty: 'Host Cancellation Penalty',
        penaltyRate: 'Penalty Rate',
        penaltyAmount: 'Penalty Amount',
        noPenalty: 'No penalty (guest cancelled)',
        penaltyNote: 'This amount will be deducted from your next payout',
        guestRefund: 'Guest Refund',
        refundAmount: 'Refund Amount',
        guestRefundDesc: 'Amount to be refunded to guest',
        reasonLabel: 'Cancellation Reason',
        reasonPlaceholder: 'Select a reason',
        reasonHint: 'Please provide a reason for cancellation',
        otherReasonPlaceholder: 'Please explain...',
        keepBooking: 'Keep Booking',
        confirmCancellation: 'Confirm Cancellation',
        cancelling: 'Cancelling...',
        toastNeedReason: 'Please select a cancellation reason',
        toastSuccess: 'Booking cancelled successfully',
        toastSuccessDescNoPenalty: 'Guest will receive full refund',
        toastSuccessDescPenalty: 'Penalty will be deducted from your next payout',
        toastFail: 'Cancellation failed',
        toastFailDesc: 'Please try again or contact support'
      },
      
      // Host Listings
      hostListings: {
        title: 'My Listings',
        count: '{{count}} listings',
        signInRequired: 'Please sign in to view listings',
        hostRequired: 'You need to be a host to view listings',
        loading: 'Loading your listings...',
        loadFail: 'Failed to load listings',
        emptyDesc: 'You haven\'t created any listings yet',
        createFirst: 'Create your first listing',
        backToDashboard: 'Back to Dashboard',
        deleteSuccess: 'Listing deleted successfully',
        deleteFail: 'Failed to delete listing',
        deleteConfirm: 'Are you sure you want to delete this listing?',
        more: 'More',
        guestsLabel: 'guests',
        tentsLabel: 'tents',
        status: {
          active: 'Active',
          pending: 'Pending Approval'
        },
        buttons: {
          view: 'View',
          edit: 'Edit',
          newListing: 'New Listing',
          manageAvailability: 'Manage Availability'
        }
      },
      
      // Payment Success/Status
      payment: {
        successTitle: 'Payment Successful!',
        successDesc: 'Your booking has been confirmed',
        pendingTitle: 'Payment Pending',
        pendingDesc: 'Your payment is being processed',
        bookingId: 'Booking ID',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        guests: 'Guests',
        totalPaid: 'Total Paid',
        contact: 'Contact host for details',
        viewBookings: 'View My Bookings',
        backHome: 'Back to Home',
        auth: {
          Y: 'Authorized',
          N: 'Not Authorized',
          C: 'Cancelled',
          E: 'Error',
          R: 'Rejected',
          U: 'Unknown',
          AI: 'Authorization In Progress',
          UNKNOWN: 'Unknown Status'
        },
        messages: {
          Y: 'Payment authorized successfully',
          N: 'Payment was not authorized',
          C: 'Payment was cancelled',
          E: 'An error occurred during payment',
          R: 'Payment was rejected',
          U: 'Payment status unknown',
          AI: 'Payment authorization in progress',
          UNKNOWN: 'Unknown payment status',
          completed: 'Payment completed successfully',
          failed: 'Payment failed'
        }
      },
      
      // Payment Failed
      paymentFailed: {
        desc: 'Your payment could not be processed',
        tryAgain: 'Try Again',
        backHome: 'Back to Home',
        commonIssues: 'Common Issues',
        issues: {
          insufficient: 'Insufficient funds',
          declined: 'Card declined',
          expired: 'Card expired',
          incorrect: 'Incorrect card details',
          auth: 'Authentication failed'
        },
        needHelp: 'Need help? Contact support'
      },
      
      // Profile page
      profile: {
        title: 'Profile',
        welcome: 'Welcome',
        signInPrompt: 'Please sign in to view your profile',
        signIn: 'Sign In',
        signOut: 'Sign Out',
        editProfile: 'Edit Profile',
        name: 'Full Name',
        phone: 'Phone Number',
        bio: 'Bio',
        noBio: 'No bio provided',
        notProvided: 'Not provided',
        saveChanges: 'Save Changes',
        saving: 'Saving...',
        cancel: 'Cancel',
        becomeHost: 'Become a Host',
        hostActive: 'Host Account Active',
        changeEmail: 'Change Email',
        verified: 'Verified',
        active: 'Active',
        memberSince: 'Member since',
        statsTitle: 'Stats',
        totalBookings: 'Total Bookings',
        listings: 'Listings',
        accountStatus: 'Account Status',
        password: {
          title: 'Change Password',
          description: 'Update your password',
          current: 'Current Password',
          new: 'New Password',
          confirm: 'Confirm New Password',
          change: 'Change Password',
          changing: 'Changing...',
          lastChanged: 'Last changed'
        },
        toasts: {
          updated: 'Profile updated successfully',
          updateFailed: 'Failed to update profile',
          pwdChanged: 'Password changed successfully',
          changeFailed: 'Failed to change password',
          mustSignIn: 'You must be signed in',
          enterCurrent: 'Please enter your current password',
          enterNew: 'Please enter a new password',
          minLength: 'Password must be at least 6 characters',
          mismatch: 'Passwords do not match',
          samePassword: 'New password must be different from current password',
          weakPassword: 'Password is too weak',
          wrongPassword: 'Current password is incorrect',
          recentLogin: 'Please sign out and sign in again to change password',
          network: 'Network error. Please try again'
        }
      },
      
      // Reserve page
      reserve: {
        completeTitle: 'Complete Your Reservation',
        reserveCreated: 'Reservation Created',
        bookingUnavailable: 'Booking unavailable',
        bookingUnavailableDesc: 'This listing is currently {{status}}. Booking will be available once it is activated.',
        back: 'Back',
        loading: 'Loading...',
        campNotFound: 'Camp not found',
        backToSearch: 'Back to Search',
        backToHost: 'Back to Host Dashboard',
        viewListing: 'View Listing',
        selectDate: 'Select a date',
        arrivalTime: 'Expected Arrival Time',
        guests: 'Number of Guests',
        contactInfo: 'Contact Information',
        phone: 'Phone Number *',
        specialRequests: 'Special Requests',
        paymentMethod: 'Payment Method',
        payOnline: 'Pay Online',
        payOnlineDesc: 'BenefitPay / Apple Pay / Card',
        cashOnArrival: 'Cash on Arrival',
        cashOnArrivalDesc: 'Pay in cash when you check in',
        createReservation: 'Create Reservation',
        creatingReservation: 'Creating Reservation...',
        checkingAvailability: 'Checking Availability...',
        checkingAvailabilityShort: 'Checking availability...',
        checkinHint: 'Standard check-in starts at {{time}}',
        guestsHint: 'This camp can accommodate up to {{max}} guests',
        guestsLabelShort: 'Guests',
        specialRequestsPlaceholder: 'Any special requirements or requests? (dietary preferences, accessibility needs, celebration occasions, etc.)',
        pendingStatus: 'Pending Payment',
        methodOnline: 'Online Payment',
        methodCash: 'Cash on Arrival',
        detailsTitle: 'Booking Details',
        totalAmount: 'Total Amount',
        payNowButton: 'Pay Now (BenefitPay / Apple Pay / Card)',
        payNowShort: 'Pay Now',
        whatsNext: "What's Next?",
        bringCash: 'Bring cash to your check-in.',
        payAnytime: 'You can still pay online anytime from here or My Bookings.',
        methodsSupported: 'BenefitPay, Apple Pay, and cards are supported.',
        viewBookings: 'View My Bookings',
        backHome: 'Back to Home',
        paymentSuccessTitle: 'Reservation Created Successfully!',
        paymentInstructionCash: 'You chose Cash on Arrival. Pay at check-in or pay online now to confirm faster.',
        paymentInstructionOnline: 'Complete your payment online to confirm your reservation.',
        bookingDetailsHeading: 'Booking Details:',
        bookingId: 'Booking ID:',
        statusLabel: 'Status:',
        dateLabel: 'Date:',
        checkInLabel: 'Check-in:',
        checkOutLabel: 'Check-out:',
        guestsLabelPayment: 'Guests:',
        totalAmountLabel: 'Total Amount:',
        priceBreakdownTitle: 'Price Breakdown',
        pricePerDay: '{{price}} BD per day',
        serviceFeeLabel: 'Service Fee (10%)',
        totalLabel: 'Total',
        upToGuests: 'Up to {{max}}',
        tentsLabel: '{{count}} Tents',
        toastSignInRequired: 'Please sign in to make a reservation',
        toastCampMissing: 'Camp information not available',
        toastSelectDate: 'Please select a date for your reservation',
        toastMinGuest: 'Please select at least 1 guest',
        toastMaxGuests: 'This camp can accommodate up to {{max}} guests',
        toastPhoneRequired: 'Please provide a contact phone number',
        toastDuplicateBooking: 'You already have a reservation on this date. Please pick a different date.',
        toastExistingBookingError: 'Could not verify your existing bookings. Please try again.',
        toastAvailabilityVerifyFailed: 'Failed to verify availability. Please try again.',
        toastReservationCreated: 'Reservation created! Payment integration coming soon.',
        toastCreateFailed: 'Failed to create reservation: {{error}}',
        toastLoadCampFailed: 'Failed to load camp details: {{error}}',
        toastSelectDateSuccess: 'Date selected! Continue to complete your booking.',
        toastSignInAvailability: 'Sign in is required to check availability.',
        toastCheckAvailabilityFailed: 'Failed to check availability'
      },
      
      // Common
      common: {
        cancel: 'Cancel',
        currency: 'BD',
        night: 'night'
      },
      
      // Status labels
      status: {
        pending: 'Pending',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        na: 'N/A'
      },
      
      // Messages
      messages: {
        loadingAvailability: 'Loading availability...',
        availabilityError: 'We could not load availability.',
        signInAgain: 'Sign in again'
      }
    }
  },
  ar: {
    translation: {
      // Loading messages
      loading: {
        default: 'جارٍ التحميل...',
        bookings: 'جارٍ تحميل حجوزاتك...',
        payment: 'جارٍ معالجة الدفع...',
        upload: 'جارٍ رفع الملفات...',
        creating: 'جارٍ الإنشاء...',
        updating: 'جارٍ التحديث...',
        deleting: 'جارٍ الحذف...',
        fetching: 'جارٍ جلب البيانات...',
        processing: 'جارٍ المعالجة...'
      },
      
      // NotFound page
      notFound: {
        title: '404',
        heading: 'الصفحة غير موجودة',
        description: 'الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.',
        returnHome: 'العودة للصفحة الرئيسية',
        goBack: 'رجوع'
      },
      
      // Listing Type
      listingType: {
        sectionTitle: 'اختر نوع القائمة',
        sectionDescription: 'اختر نوع القائمة التي تريد عرضها',
        camp: {
          title: 'مخيم',
          description: 'تجربة تخييم صحراوية مع خيام',
          badge: 'مخيم',
          features: 'خيام، أنشطة صحراوية، تخييم تقليدي'
        },
        kashta: {
          title: 'كشتة',
          description: 'منطقة جلوس على شاطئ البحر',
          badge: 'كشتة',
          features: 'وصول للشاطئ، أنشطة مائية، إطلالات بحرية',
          nameLabel: 'اسم الكشتة'
        },
        all: 'جميع القوائم',
        selectType: 'اختر نوع القائمة'
      },
      
      // Kashta specific
      kashta: {
        seatingCapacity: '{{count}} مقعد',
        beachfront: 'على الشاطئ',
        shade: {
          tent: 'خيمة ظل',
          umbrella: 'مظلة شاطئ',
          pergola: 'برجولا',
          natural: 'ظل طبيعي'
        },
        view: {
          sea: 'إطلالة بحرية',
          beach: 'إطلالة على الشاطئ',
          mixed: 'إطلالة مختلطة'
        },
        activities: {
          swimming: 'سباحة',
          fishing: 'صيد السمك',
          snorkeling: 'غطس',
          boating: 'قوارب'
        },
        form: {
          seatingCapacity: 'سعة الجلوس',
          seatingCapacityPlaceholder: 'عدد الأشخاص',
          seatingCapacityHelper: 'الحد الأقصى لعدد الأشخاص في منطقة الجلوس',
          beachfrontAccess: 'وصول مباشر للشاطئ',
          beachfrontAccessHelper: 'هل لهذه الكشتة وصول مباشر للشاطئ؟',
          shadeType: 'نوع الظل',
          shadeTypePlaceholder: 'اختر نوع الظل',
          viewType: 'نوع الإطلالة',
          amenities: 'مرافق الكشتة',
          waterActivities: 'الأنشطة المائية'
        }
      },
      
      // Amenity Categories
        kashtaDescription: 'الوصف',
        kashtaDescriptionPlaceholder: 'صف الكشتة الخاصة بك...',
      amenityCategories: {
        essential: 'أساسي',
        comfort: 'راحة',
        cooking: 'طبخ',
        entertainment: 'ترفيه',
        activities: 'أنشطة',
        seating: 'جلوس',
        other: 'أخرى'
      },
      
      // Auth - Sign In page
      auth: {
        welcomeBack: 'مرحباً بعودتك',
        signInSubtitle: 'سجل دخولك للوصول إلى حسابك',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        forgot: 'نسيت كلمة المرور؟',
        signIn: 'تسجيل الدخول',
        signingIn: 'جارٍ تسجيل الدخول...',
        sending: 'جارٍ الإرسال...',
        orContinue: 'أو تابع باستخدام',
        google: 'المتابعة مع جوجل',
        noAccount: 'ليس لديك حساب؟',
        signUp: 'إنشاء حساب',
        enterEmailFirst: 'يرجى إدخال بريدك الإلكتروني أولاً'
      },
      
      // Auth - Sign Up page
      authSignUp: {
        join: 'انضم إلى صحرا',
        subtitle: 'أنشئ حسابك لبدء الحجز',
        fullName: 'الاسم الكامل',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        passwordHint: 'على الأقل 6 أحرف',
        createAccount: 'إنشاء حساب',
        creating: 'جارٍ إنشاء الحساب...',
        orContinue: 'أو تابع باستخدام',
        google: 'المتابعة مع جوجل',
        haveAccount: 'لديك حساب بالفعل؟',
        signIn: 'تسجيل الدخول'
      },
      
      // Bookings User page
      bookingsUser: {
        title: 'حجوزاتي',
        count: '{{count}} حجز',
        current: 'الحالية',
        past: 'السابقة',
        emptyTitle: 'لا توجد حجوزات بعد',
        emptyDesc: 'ابدأ الاستكشاف واحجز مكان التخييم المثالي!',
        viewDetails: 'عرض التفاصيل',
        payNow: 'ادفع الآن',
        cancel: 'إلغاء الحجز',
        writeReview: 'اكتب مراجعة',
        statusTitle: 'حالة الحجز',
        statusDesc: 'حالة الحجز الحالية'
      },
      
      // Camp Details page
      campDetails: {
        loading: 'جارٍ تحميل تفاصيل المخيم...',
        notFound: 'المخيم غير موجود',
        back: 'العودة للبحث',
        backToSearch: 'العودة للبحث',
        pendingApproval: 'هذا الإعلان في انتظار الموافقة',
        overview: 'نظرة عامة',
        about: 'عن هذا المخيم',
        amenities: 'المرافق',
        reviews: 'المراجعات',
        campHours: 'ساعات المخيم',
        checkIn: 'تسجيل الوصول',
        checkOut: 'تسجيل المغادرة',
        nextDay: 'اليوم التالي',
        fullDayHint: 'تجربة يوم كامل من الصباح إلى اليوم التالي',
        maxGuests: 'الحد الأقصى للضيوف',
        totalTents: 'إجمالي الخيام',
        pricePerDay: 'في اليوم',
        reserveNow: 'احجز الآن',
        cancellationPolicy: 'سياسة الإلغاء',
        refundNote: 'إلغاء مجاني ضمن شروط السياسة',
        writeReview: 'اكتب مراجعة',
        reviewDialog: 'شارك تجربتك',
        reviewSuccess: 'شكراً لك على مراجعتك!',
        signInReview: 'يرجى تسجيل الدخول لكتابة مراجعة',
        loadCampFailed: 'فشل تحميل تفاصيل المخيم',
        accommodates: 'يستوعب',
        tentsLabel: 'خيام',
        tentDetails: 'تفاصيل الخيمة',
        tentTypes: {
          small: 'خيمة صغيرة',
          large: 'خيمة كبيرة',
          entertainment: 'خيمة ترفيهية',
          generic: 'خيمة عامة'
        },
        tentFeatures: {
          count: '{{count}} خيمة',
          none: 'لا توجد مميزات محددة',
          noDetails: 'لا توجد تفاصيل متاحة',
          furnished: 'مفروشة',
          carpeted: 'مفروشة بالسجاد',
          sofas: 'أرائك',
          teaSets: 'أطقم شاي',
          tv: 'تلفزيون',
          airHockey: 'طاولة هوكي هوائي',
          foosball: 'طاولة كرة القدم',
          pingPong: 'طاولة تنس الطاولة',
          football: 'ملعب كرة قدم',
          volleyball: 'ملعب كرة طائرة'
        },
        policy: {
          flexible: {
            name: 'مرن',
            description: 'استرداد كامل إذا تم الإلغاء قبل 24+ ساعة من تسجيل الوصول',
            detail1: '24+ ساعة قبل تسجيل الوصول',
            detail1Note: 'استرداد كامل (بعد خصم رسوم الخدمة)',
            detail2: 'أقل من 24 ساعة',
            detail2Note: 'لا يوجد استرداد'
          },
          moderate: {
            name: 'معتدل',
            description: 'استرداد 50٪ إذا تم الإلغاء قبل 48+ ساعة من تسجيل الوصول',
            detail1: '48+ ساعة قبل تسجيل الوصول',
            detail1Note: 'استرداد 50٪',
            detail2: 'أقل من 48 ساعة',
            detail2Note: 'لا يوجد استرداد'
          },
          strict: {
            name: 'صارم',
            description: 'استرداد 50٪ إذا تم الإلغاء قبل 7+ أيام من تسجيل الوصول',
            detail1: '7+ أيام قبل تسجيل الوصول',
            detail1Note: 'استرداد 50٪',
            detail2: 'أقل من 7 أيام',
            detail2Note: 'لا يوجد استرداد'
          }
        }
      },
      
      // Cancellation Policy Selector
      cancelSelector: {
        title: 'سياسة الإلغاء',
        subtitle: 'اختر مدى المرونة التي تريدها مع الإلغاءات',
        mostPopular: 'الأكثر شيوعاً',
        flexible: {
          name: 'مرن',
          line1: 'استرداد كامل إذا تم الإلغاء قبل 24 ساعة من تسجيل الوصول',
          line2: 'استرداد 50٪ إذا تم الإلغاء خلال 24 ساعة'
        },
        moderate: {
          name: 'معتدل',
          line1: 'استرداد كامل إذا تم الإلغاء قبل 5 أيام من تسجيل الوصول',
          line2: 'استرداد 50٪ إذا تم الإلغاء قبل 2-5 أيام'
        },
        strict: {
          name: 'صارم',
          line1: 'استرداد كامل إذا تم الإلغاء قبل 7 أيام من تسجيل الوصول',
          line2: 'لا يوجد استرداد إذا تم الإلغاء خلال 7 أيام'
        }
      },
      
      // Create Listing page
      createListing: {
        title: 'إنشاء إعلان جديد',
        subtitle: 'شارك مساحة التخييم الخاصة بك مع المسافرين',
        signInRequired: 'يرجى تسجيل الدخول لإنشاء إعلان',
        hostRequired: 'تحتاج إلى أن تكون مضيفاً لإنشاء إعلانات',
        selectType: 'اختر نوع القائمة',
        typeLockedWarning: 'لا يمكن تغيير نوع القائمة بعد بدء ملء النموذج',
        campDetails: 'تفاصيل المخيم',
        kashtaDetails: 'تفاصيل الكشتة',
        basicInfo: 'المعلومات الأساسية',
        campName: 'اسم المخيم',
        campLocation: 'موقع المخيم',
        campArea: 'منطقة المخيم',
        campAreaPlaceholder: 'مثل: القرة، المنطقة الشمالية',
        description: 'الوصف',
        descriptionPlaceholder: 'صف مساحة التخييم الخاصة بك، ما يجعلها مميزة، المعالم القريبة...',
        
        capacity: {
          title: 'السعة والخيام',
          maxGuestsHelper: 'الحد الأقصى لعدد الضيوف الذي يمكن لمخيمك استيعابه',
          areaHelper: 'المساحة الإجمالية المتاحة لأنشطة التخييم'
        },
        
        capacityTents: 'السعة والخيام',
        maxGuests: 'الحد الأقصى للضيوف',
        maxGuestsPlaceholder: 'مثل: 20',
        
        tents: {
          sectionTitle: 'تكوين الخيام',
          largeLabel: 'خيام كبيرة',
          smallLabel: 'خيام صغيرة',
          entertainmentLabel: 'خيام ترفيهية',
          genericLabel: 'خيام عامة',
          none: 'لا يوجد',
          addLarge: 'إضافة خيمة كبيرة',
          addSmall: 'إضافة خيمة صغيرة',
          addEntertainment: 'إضافة خيمة ترفيهية',
          descriptionLabel: 'الوصف',
          descriptionPlaceholder: 'صف هذه الخيمة...',
          featuresTitle: 'المميزات',
          featureLabels: {
            furnished: 'مفروشة',
            carpeted: 'مفروشة بالسجاد',
            sofas: 'أرائك',
            teaSets: 'أطقم شاي',
            tv: 'تلفزيون',
            airHockeyTable: 'طاولة هوكي هوائي',
            foosballTable: 'طاولة كرة القدم',
            pingPongTable: 'طاولة تنس الطاولة',
            footballField: 'ملعب كرة قدم',
            volleyballField: 'ملعب كرة طائرة'
          },
          helper: 'أضف خيام إلى مخيمك'
        },
        
        times: {
          helper: 'حدد أوقات تسجيل الوصول والمغادرة',
          checkInHelper: 'متى يمكن للضيوف الوصول',
          checkOutHelper: 'متى يجب على الضيوف المغادرة (اليوم التالي)'
        },
        
        checkIn: 'وقت تسجيل الوصول',
        checkOut: 'وقت تسجيل المغادرة',
        nextDay: 'اليوم التالي',
        
        pricing: {
          perDay: 'السعر في اليوم',
          helper: 'حدد سعرك اليومي بالدينار البحريني'
        },
        
        price: 'السعر في اليوم (د.ب)',
        pricePlaceholder: 'مثل: 50',
        
        selectLocation: 'اختر الموقع',
        searchLocations: 'البحث عن المواقع...',
        useMyLocation: 'استخدم موقعي الحالي',
        gettingLocation: 'جارٍ الحصول على موقعك...',
        locationCaptured: 'تم التقاط الموقع!',
        locationFailed: 'فشل الحصول على الموقع',
        geoUnsupported: 'تحديد الموقع الجغرافي غير مدعوم من متصفحك',
        googleMapsUrl: 'رابط خرائط جوجل',
        locationHelper: 'حدد موقع مخيمك',
        locationRequired: 'الموقع مطلوب',
        noLocation: 'لم يتم تحديد الموقع',
        or: 'أو',
        
        map: {
          chooseMethod: 'اختر طريقة لتحديد الموقع',
          pasteLink: 'لصق رابط خرائط جوجل',
          pasteHelper: 'الصق رابط مشاركة خرائط جوجل هنا',
          setCoordinates: 'تعيين الإحداثيات',
          locationSet: 'تم تعيين الموقع بنجاح',
          fullDay: 'تجربة تخييم ليوم كامل',
          coordinates: 'الإحداثيات',
          parseError: 'فشل تحليل الإحداثيات'
        },
        
        photosTitle: 'الصور',
        photosHelper: 'أضف صوراً لمخيمك (3 صور على الأقل)',
        
        amenitiesSection: 'المرافق',
        amenitiesHelper: 'حدد جميع المرافق المتاحة في مخيمك',
        selectedAmenities: 'المرافق المحددة',
        
        amenityCategories: {
          essential: 'أساسي',
          comfort: 'راحة',
          cooking: 'طبخ',
          entertainment: 'ترفيه',
          activities: 'أنشطة',
          other: 'أخرى'
        },
        
        amenityItems: {
          'Restrooms': 'دورات مياه',
          'Kitchen': 'مطبخ',
          'Electricity': 'كهرباء',
          'Lighting': 'إضاءة',
          'Water Supply': 'إمداد مياه',
          'Fire Pit': 'حفرة نار',
          'BBQ Grill': 'شواية',
          'Cooking Equipment': 'معدات طبخ',
          'Dining Area': 'منطقة طعام',
          'Sound System': 'نظام صوتي',
          'TV Available': 'تلفزيون متاح',
          'Volleyball Court': 'ملعب كرة طائرة',
          'Soccer Court': 'ملعب كرة قدم',
          'Bouncy Castle': 'قلعة نطاطة',
          'Furnished Tents': 'خيام مفروشة',
          'Carpeted Tents': 'خيام مفروشة بالسجاد',
          'Sofas & Seating': 'أرائك ومقاعد',
          'Tea Sets': 'أطقم شاي',
          'Air Conditioning': 'تكييف هواء',
          'Dune Buggies': 'عربات الكثبان الرملية',
          'Desert Tours': 'جولات صحراوية',
          'Camel Rides': 'ركوب الجمال',
          'Stargazing Area': 'منطقة مراقبة النجوم',
          'Biking': 'ركوب الدراجات',
          'Parking': 'موقف سيارات',
          'Pet Friendly': 'صديق للحيوانات الأليفة',
          'Family Friendly': 'مناسب للعائلات',
          'Security/Guards': 'أمن/حراس',
          'Food Truck Access': 'وصول شاحنات الطعام'
        },
        
        featuresRules: 'المميزات والقواعد',
        specialFeatures: 'مميزات خاصة',
        rules: 'قواعد المخيم',
        
        sections: {
          details: 'التفاصيل'
        },
        
        createListing: 'إنشاء إعلان',
        submitting: 'جارٍ إنشاء الإعلان...',
        updateFail: 'فشل تحديث الإعلان'
      },
      
      // Edit Listing page
      editListing: {
        title: 'تعديل الإعلان',
        subtitle: 'تحديث إعلان المخيم',
        loading: 'جارٍ تحميل الإعلان...',
        signInRequired: 'يرجى تسجيل الدخول لتعديل الإعلانات',
        hostRequired: 'تحتاج إلى أن تكون مضيفاً لتعديل الإعلانات',
        invalidId: 'معرف إعلان غير صالح',
        notFound: 'الإعلان غير موجود',
        noPermission: 'ليس لديك إذن لتعديل هذا الإعلان',
        back: 'العودة إلى إعلاناتي',
        saveChanges: 'حفظ التغييرات',
        saving: 'جارٍ حفظ التغييرات...',
        success: 'تم تحديث الإعلان بنجاح!',
        cancelConfirm: 'تجاهل التغييرات؟',
        
        map: {
          geoUnsupported: 'تحديد الموقع الجغرافي غير مدعوم',
          unableLocation: 'تعذر الحصول على الموقع',
          parseError: 'فشل تحليل الإحداثيات'
        },
        
        validations: {
          locationRequired: 'يرجى تحديد موقع لمخيمك',
          coordinatesRequired: 'إحداثيات الموقع مطلوبة',
          maxGuests: 'يجب أن يكون الحد الأقصى للضيوف 1 على الأقل',
          tents: 'يرجى إضافة خيمة واحدة على الأقل',
          images: 'يرجى إضافة 3 صور على الأقل',
          uploading: 'يرجى الانتظار حتى تنتهي الصور من التحميل'
        }
      },
      
      // Filters
      filters: {
        location: 'الموقع',
        bookingDate: 'تاريخ الحجز',
        selectDate: 'اختر تاريخاً',
        clearDate: 'مسح التاريخ',
        findAvailable: 'البحث عن المخيمات المتاحة',
        priceRange: 'نطاق السعر',
        up: 'حتى',
        minGuests: 'الحد الأدنى للضيوف',
        tentTypes: 'أنواع الخيام',
        largeTents: 'خيام كبيرة',
        smallTents: 'خيام صغيرة',
        entertainmentTents: 'خيام ترفيهية',
        amenities: 'المرافق',
        minRating: 'الحد الأدنى للتقييم',
        allRatings: 'جميع التقييمات',
        apply: 'تطبيق الفلاتر',
        reset: 'إعادة تعيين',
        listingType: 'نوع القائمة',
        allTypes: 'جميع الأنواع'
      },
      
      // Header
      header: {
        brand: 'صحرا',
        admin: 'لوحة المشرف',
        profile: 'حسابي',
        signOut: 'تسجيل خروج',
        signIn: 'تسجيل الدخول',
        signUp: 'إنشاء حساب'
      },
      
      // Navigation
      nav: {
        search: 'بحث',
        bookings: 'الحجوزات',
        host: 'المضيف',
        profile: 'الملف الشخصي'
      },
      
      // Home page
      home: {
        heroTitleTop: 'اكتشف تجربة',
        heroTitleBottom: 'التخييم الصحراوي المثالية',
        heroSubtitle: 'احجز أماكن تخييم فريدة في جميع أنحاء البحرين',
        searchPlaceholder: 'البحث حسب الموقع...',
        datePlaceholder: 'اختر التاريخ',
        searchButton: 'بحث',
        filters: 'الفلاتر',
        sortBy: 'ترتيب حسب',
        sortNewest: 'الأحدث',
        sortPriceAsc: 'السعر: من الأقل إلى الأعلى',
        sortPriceDesc: 'السعر: من الأعلى إلى الأقل',
        sortRating: 'الأعلى تقييماً',
        loadingCamps: 'جارٍ تحميل المخيمات...',
        noCampsTitle: 'لم يتم العثور على مخيمات',
        noCampsGeneral: 'حاول تعديل الفلاتر أو معايير البحث',
        noCampsDate: 'لا توجد مخيمات متاحة للتاريخ المحدد',
        perDay: 'في اليوم',
        viewDetails: 'عرض التفاصيل',
        datePickedLabel: 'تم اختيار التاريخ',
        clear: 'مسح',
        clearAll: 'مسح الكل',
        checkingAvailability: 'جارٍ التحقق من التوفر...',
        availabilityHint: 'اختر تاريخاً للتحقق من التوفر',
        campsAvailable: '{{count}} مخيم متاح',
        filterApplied: '{{count}} فلتر مطبق',
        reviewCount: '{{count}} مراجعة',
        upToGuests: 'حتى {{count}} ضيف',
        tentsCount: '{{count}} خيمة'
      },
      
      // Host Dashboard
      host: {
        heroTitle: 'لوحة المضيف',
        heroDesc: 'إدارة إعلاناتك وحجوزاتك',
        heroCreate: 'إنشاء إعلان جديد',
        heroManage: 'إدارة الإعلانات',
        dashboardTitle: 'مرحباً بعودتك!',
        dashboardSubtitle: 'إدارة أعمال التخييم الخاصة بك',
        createTitle: 'إنشاء إعلان جديد',
        createDesc: 'شارك مساحة التخييم الخاصة بك',
        manageTitle: 'إعلاناتي',
        manageDesc: 'تعديل وإدارة مخيماتك',
        bookingsTitle: 'الحجوزات',
        bookingsCount: '{{count}} حجز',
        bookingsCardTitle: 'الحجوزات الأخيرة',
        bookingsCardDesc: 'عرض وإدارة الحجوزات',
        analyticsTitle: 'التحليلات',
        analyticsDesc: 'تتبع أدائك',
        back: 'العودة للوحة التحكم',
        noBookings: 'لا توجد حجوزات بعد',
        noBookingsHint: 'ستظهر حجوزاتك هنا',
        refresh: 'تحديث'
      },
      
      // Host Cancellation
      hostCancellation: {
        title: 'إلغاء الحجز',
        description: 'إلغاء هذا الحجز ومعالجة الاسترداد',
        bookingDetails: 'تفاصيل الحجز',
        camp: 'المخيم',
        guest: 'الضيف',
        guests: 'الضيوف',
        checkIn: 'تسجيل الوصول',
        checkOut: 'تسجيل المغادرة',
        bookingAmount: 'مبلغ الحجز',
        importantNotice: 'إشعار مهم',
        importantDesc: 'قد يؤدي إلغاء هذا الحجز إلى عقوبات',
        hostPenalty: 'غرامة إلغاء المضيف',
        penaltyRate: 'معدل الغرامة',
        penaltyAmount: 'مبلغ الغرامة',
        noPenalty: 'لا توجد غرامة (ألغى الضيف)',
        penaltyNote: 'سيتم خصم هذا المبلغ من دفعتك التالية',
        guestRefund: 'استرداد الضيف',
        refundAmount: 'مبلغ الاسترداد',
        guestRefundDesc: 'المبلغ الذي سيتم استرداده للضيف',
        reasonLabel: 'سبب الإلغاء',
        reasonPlaceholder: 'اختر سبباً',
        reasonHint: 'يرجى تقديم سبب للإلغاء',
        otherReasonPlaceholder: 'يرجى التوضيح...',
        keepBooking: 'الاحتفاظ بالحجز',
        confirmCancellation: 'تأكيد الإلغاء',
        cancelling: 'جارٍ الإلغاء...',
        toastNeedReason: 'يرجى اختيار سبب الإلغاء',
        toastSuccess: 'تم إلغاء الحجز بنجاح',
        toastSuccessDescNoPenalty: 'سيحصل الضيف على استرداد كامل',
        toastSuccessDescPenalty: 'سيتم خصم الغرامة من دفعتك التالية',
        toastFail: 'فشل الإلغاء',
        toastFailDesc: 'يرجى المحاولة مرة أخرى أو الاتصال بالدعم'
      },
      
      // Host Listings
      hostListings: {
        title: 'إعلاناتي',
        count: '{{count}} إعلان',
        signInRequired: 'يرجى تسجيل الدخول لعرض الإعلانات',
        hostRequired: 'تحتاج إلى أن تكون مضيفاً لعرض الإعلانات',
        loading: 'جارٍ تحميل إعلاناتك...',
        loadFail: 'فشل تحميل الإعلانات',
        emptyDesc: 'لم تقم بإنشاء أي إعلانات بعد',
        createFirst: 'أنشئ إعلانك الأول',
        backToDashboard: 'العودة للوحة التحكم',
        deleteSuccess: 'تم حذف الإعلان بنجاح',
        deleteFail: 'فشل حذف الإعلان',
        deleteConfirm: 'هل أنت متأكد من حذف هذا الإعلان؟',
        more: 'المزيد',
        guestsLabel: 'ضيوف',
        tentsLabel: 'خيام',
        status: {
          active: 'نشط',
          pending: 'في انتظار الموافقة'
        },
        buttons: {
          view: 'عرض',
          edit: 'تعديل',
          newListing: 'إعلان جديد',
          manageAvailability: 'إدارة التوفر'
        }
      },
      
      // Payment Success/Status
      payment: {
        successTitle: 'تم الدفع بنجاح!',
        successDesc: 'تم تأكيد حجزك',
        pendingTitle: 'الدفع قيد الانتظار',
        pendingDesc: 'جارٍ معالجة دفعتك',
        bookingId: 'رقم الحجز',
        checkIn: 'تسجيل الوصول',
        checkOut: 'تسجيل المغادرة',
        guests: 'الضيوف',
        totalPaid: 'إجمالي المدفوع',
        contact: 'اتصل بالمضيف للحصول على التفاصيل',
        viewBookings: 'عرض حجوزاتي',
        backHome: 'العودة للصفحة الرئيسية',
        auth: {
          Y: 'مصرح به',
          N: 'غير مصرح به',
          C: 'ملغى',
          E: 'خطأ',
          R: 'مرفوض',
          U: 'غير معروف',
          AI: 'التصريح قيد التنفيذ',
          UNKNOWN: 'حالة غير معروفة'
        },
        messages: {
          Y: 'تم التصريح بالدفع بنجاح',
          N: 'لم يتم التصريح بالدفع',
          C: 'تم إلغاء الدفع',
          E: 'حدث خطأ أثناء الدفع',
          R: 'تم رفض الدفع',
          U: 'حالة الدفع غير معروفة',
          AI: 'التصريح بالدفع قيد التنفيذ',
          UNKNOWN: 'حالة دفع غير معروفة',
          completed: 'تم الدفع بنجاح',
          failed: 'فشل الدفع'
        }
      },
      
      // Payment Failed
      paymentFailed: {
        desc: 'تعذر معالجة دفعتك',
        tryAgain: 'حاول مرة أخرى',
        backHome: 'العودة للصفحة الرئيسية',
        commonIssues: 'المشاكل الشائعة',
        issues: {
          insufficient: 'رصيد غير كافٍ',
          declined: 'تم رفض البطاقة',
          expired: 'انتهت صلاحية البطاقة',
          incorrect: 'تفاصيل البطاقة غير صحيحة',
          auth: 'فشل التحقق'
        },
        needHelp: 'تحتاج مساعدة؟ اتصل بالدعم'
      },
      
      // Profile page
      profile: {
        title: 'الملف الشخصي',
        welcome: 'مرحباً',
        signInPrompt: 'يرجى تسجيل الدخول لعرض ملفك الشخصي',
        signIn: 'تسجيل الدخول',
        signOut: 'تسجيل خروج',
        editProfile: 'تعديل الملف الشخصي',
        name: 'الاسم الكامل',
        phone: 'رقم الهاتف',
        bio: 'نبذة',
        noBio: 'لا توجد نبذة',
        notProvided: 'غير متوفر',
        saveChanges: 'حفظ التغييرات',
        saving: 'جارٍ الحفظ...',
        cancel: 'إلغاء',
        becomeHost: 'كن مضيفاً',
        hostActive: 'حساب المضيف نشط',
        changeEmail: 'تغيير البريد الإلكتروني',
        verified: 'موثق',
        active: 'نشط',
        memberSince: 'عضو منذ',
        statsTitle: 'الإحصائيات',
        totalBookings: 'إجمالي الحجوزات',
        listings: 'الإعلانات',
        accountStatus: 'حالة الحساب',
        password: {
          title: 'تغيير كلمة المرور',
          description: 'تحديث كلمة المرور',
          current: 'كلمة المرور الحالية',
          new: 'كلمة المرور الجديدة',
          confirm: 'تأكيد كلمة المرور الجديدة',
          change: 'تغيير كلمة المرور',
          changing: 'جارٍ التغيير...',
          lastChanged: 'آخر تغيير'
        },
        toasts: {
          updated: 'تم تحديث الملف الشخصي بنجاح',
          updateFailed: 'فشل تحديث الملف الشخصي',
          pwdChanged: 'تم تغيير كلمة المرور بنجاح',
          changeFailed: 'فشل تغيير كلمة المرور',
          mustSignIn: 'يجب تسجيل الدخول',
          enterCurrent: 'يرجى إدخال كلمة المرور الحالية',
          enterNew: 'يرجى إدخال كلمة مرور جديدة',
          minLength: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
          mismatch: 'كلمات المرور غير متطابقة',
          samePassword: 'يجب أن تكون كلمة المرور الجديدة مختلفة عن الحالية',
          weakPassword: 'كلمة المرور ضعيفة جداً',
          wrongPassword: 'كلمة المرور الحالية غير صحيحة',
          recentLogin: 'يرجى تسجيل الخروج وتسجيل الدخول مرة أخرى لتغيير كلمة المرور',
          network: 'خطأ في الشبكة. يرجى المحاولة مرة أخرى'
        }
      },
      
      // Reserve page
      reserve: {
        completeTitle: 'أكمل حجزك',
        reserveCreated: 'تم إنشاء الحجز',
        bookingUnavailable: 'الحجز غير متاح',
        bookingUnavailableDesc: 'هذا الإعلان حالياً {{status}}. سيكون الحجز متاحاً عند تفعيله.',
        back: 'رجوع',
        loading: 'جاري التحميل...',
        campNotFound: 'المخيم غير موجود',
        backToSearch: 'العودة للبحث',
        backToHost: 'العودة للوحة المضيف',
        viewListing: 'عرض الإعلان',
        selectDate: 'اختر تاريخاً',
        arrivalTime: 'وقت الوصول المتوقع',
        guests: 'عدد الضيوف',
        contactInfo: 'معلومات التواصل',
        phone: 'رقم الهاتف *',
        specialRequests: 'ملاحظات خاصة',
        paymentMethod: 'طريقة الدفع',
        payOnline: 'الدفع أونلاين',
        payOnlineDesc: 'بنفت باي / أبل باي / بطاقة',
        cashOnArrival: 'الدفع عند الوصول',
        cashOnArrivalDesc: 'ادفع نقداً عند تسجيل الدخول',
        createReservation: 'إنشاء الحجز',
        creatingReservation: 'جاري إنشاء الحجز...',
        checkingAvailability: 'جارٍ التحقق من التوفر...',
        checkingAvailabilityShort: 'جارٍ التحقق من التوفر...',
        checkinHint: 'تسجيل الوصول يبدأ عند {{time}}',
        guestsHint: 'هذا المخيم يستوعب حتى {{max}} ضيفاً',
        guestsLabelShort: 'ضيوف',
        specialRequestsPlaceholder: 'أي متطلبات أو ملاحظات خاصة؟ (حساسية غذائية، احتياجات وصول، مناسبات... إلخ)',
        pendingStatus: 'في انتظار الدفع',
        methodOnline: 'دفع إلكتروني',
        methodCash: 'دفع عند الوصول',
        detailsTitle: 'تفاصيل الحجز',
        totalAmount: 'المبلغ الإجمالي',
        payNowButton: 'ادفع الآن (بنفت باي / أبل باي / بطاقة)',
        payNowShort: 'ادفع الآن',
        whatsNext: 'ما التالي؟',
        bringCash: 'أحضر النقود معك عند الوصول.',
        payAnytime: 'يمكنك الدفع أونلاين في أي وقت من هنا أو من حجوزاتي.',
        methodsSupported: 'بنفت باي، أبل باي، وبطاقات الدفع مدعومة.',
        viewBookings: 'عرض حجوزاتي',
        backHome: 'العودة للصفحة الرئيسية',
        paymentSuccessTitle: 'تم إنشاء الحجز بنجاح!',
        paymentInstructionCash: 'اخترت الدفع عند الوصول. ادفع عند تسجيل الدخول أو ادفع أونلاين للتأكيد أسرع.',
        paymentInstructionOnline: 'أكمل الدفع أونلاين لتأكيد الحجز.',
        bookingDetailsHeading: 'تفاصيل الحجز:',
        bookingId: 'رقم الحجز:',
        statusLabel: 'الحالة:',
        dateLabel: 'التاريخ:',
        checkInLabel: 'تسجيل الوصول:',
        checkOutLabel: 'تسجيل المغادرة:',
        guestsLabelPayment: 'الضيوف:',
        totalAmountLabel: 'المبلغ الإجمالي:',
        priceBreakdownTitle: 'تفاصيل السعر',
        pricePerDay: '{{price}} د.ب في اليوم',
        serviceFeeLabel: 'رسوم خدمة (10%)',
        totalLabel: 'الإجمالي',
        upToGuests: 'حتى {{max}} ضيف',
        tentsLabel: '{{count}} خيمة',
        toastSignInRequired: 'يرجى تسجيل الدخول لإجراء الحجز',
        toastCampMissing: 'معلومات المخيم غير متوفرة',
        toastSelectDate: 'يرجى اختيار تاريخ للحجز',
        toastMinGuest: 'يرجى اختيار ضيف واحد على الأقل',
        toastMaxGuests: 'هذا المخيم يستوعب حتى {{max}} ضيفاً',
        toastPhoneRequired: 'يرجى إدخال رقم هاتف للتواصل',
        toastDuplicateBooking: 'لديك حجز بالفعل في هذا التاريخ. يرجى اختيار تاريخ آخر.',
        toastExistingBookingError: 'تعذر التحقق من حجوزاتك الحالية. حاول مرة أخرى.',
        toastAvailabilityVerifyFailed: 'تعذر التحقق من التوفر. حاول مرة أخرى.',
        toastReservationCreated: 'تم إنشاء الحجز! سيتم إتمام الدفع لاحقاً.',
        toastCreateFailed: 'فشل إنشاء الحجز: {{error}}',
        toastLoadCampFailed: 'فشل تحميل تفاصيل المخيم: {{error}}',
        toastSelectDateSuccess: 'تم اختيار التاريخ! أكمل حجزك.',
        toastSignInAvailability: 'يجب تسجيل الدخول للتحقق من التوفر.',
        toastCheckAvailabilityFailed: 'تعذر التحقق من التوفر'
      },
      
      // Common
      common: {
        cancel: 'إلغاء',
        currency: 'د.ب',
        night: 'ليلة'
      },
      
      // Status labels
      status: {
        pending: 'قيد الانتظار',
        confirmed: 'مؤكد',
        cancelled: 'ملغى',
        na: 'غير متاح'
      },
      
      // Messages
      messages: {
        loadingAvailability: 'جارٍ تحميل التوفر...',
        availabilityError: 'تعذر تحميل التوفر.',
        signInAgain: 'تسجيل الدخول مرة أخرى'
      }
    }
  }
};

// Get saved language from localStorage or default to English
const savedLanguage = localStorage.getItem('language') || 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;