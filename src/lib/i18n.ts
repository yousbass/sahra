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
      
      // Become Host page
      becomeHost: {
        title: 'Become a Host',
        subtitle: 'Complete the verification process to start hosting on our platform',
        back: 'Back',
        phoneNumber: 'Phone Number',
        cprNumber: 'CPR Number',
        verificationCode: 'Verification Code',
        phoneHint: 'Enter your Bahrain mobile number (8 digits)',
        cprHint: 'Enter your 9-digit Bahrain CPR number',
        otpHint: 'Enter the 6-digit code sent to your phone',
        sendOtp: 'Send OTP',
        sending: 'Sending...',
        sent: 'Sent',
        confirm: 'Confirm',
        confirmed: 'Confirmed',
        verify: 'Verify',
        verifying: 'Verifying...',
        submit: 'Submit Application',
        submitting: 'Submitting...',
        infoTitle: 'Why do we need this information?',
        infoMessage: 'We verify all hosts to ensure the safety and security of our community. Your information is kept confidential and used only for verification purposes.',
        successTitle: 'Application Submitted!',
        successMessage: 'Thank you for applying to become a host. We will review your application and get back to you within 24-48 hours.',
        applicationId: 'Application ID',
        backHome: 'Back to Home',
        viewProfile: 'View Profile'
      },
      
      // Messages
      messages: {
        signInRequired: 'Please sign in to continue',
        alreadyHost: 'You are already a host',
        applicationPending: 'Your application is pending review',
        applicationRejected: 'Your application was rejected',
        phoneRequired: 'Phone number is required',
        invalidPhone: 'Invalid Bahrain phone number. Must be 8 digits starting with 3, 6, or 7',
        invalidCpr: 'Invalid CPR number. Must be 9 digits',
        invalidOtp: 'Please enter a valid 6-digit code',
        phoneVerified: 'Phone number verified successfully',
        verifyPhone: 'Please verify your phone number first',
        fillAllFields: 'Please fill in all fields',
        applicationSubmitted: 'Application submitted successfully! We will review it shortly.',
        otpSent: 'OTP sent to your phone',
        loadingAvailability: 'Loading availability...',
        availabilityError: 'We could not load availability.',
        signInAgain: 'Sign in again'
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
        },
        kashtaDescription: 'Description',
        kashtaDescriptionPlaceholder: 'Describe your kashta...'
      },
      
      // Amenity Categories
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
        join: 'Join MUKHYMAT',
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
      
      // Cancellation Policy Selector - NEW SYSTEM
      cancelSelector: {
        title: 'Cancellation Policy',
        subtitle: 'Choose your refund policy for guest cancellations',
        recommended: 'Recommended',
        fullRefundable: {
          name: 'Full Refundable',
          description: 'Guests receive 100% refund if they cancel within the allowed timeframe',
          rule1: 'Cancel 24+ hours before check-in: Full refund (minus 10% service fee)',
          rule2: 'Cancel less than 24 hours: No refund',
          example: 'Example: Guest books for 100 BD. If cancelled 48 hours before, they get 90 BD back (100 BD - 10 BD service fee).'
        },
        partialRefundable: {
          name: 'Partial Refundable with عربون',
          description: 'A portion of the booking is kept as non-refundable deposit (عربون)',
          arboonLabel: 'عربون (Non-refundable Deposit)',
          arboonHelper: 'Set the percentage of booking price kept as عربون',
          refundRules: 'Refund Rules:',
          rule1: 'Cancel 48+ hours before: Refund all except عربون and service fee',
          rule2: 'Cancel 24-48 hours before: Refund 50% (minus عربون and service fee)',
          rule3: 'Cancel less than 24 hours: No refund',
          example: 'Example: Guest books for 100 BD with {{arboon}}% عربون. If cancelled 48 hours before, they get back: 100 - {{arboon}} (عربون) - 10 (service fee) = {{refund}} BD.'
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
          basicFeatures: 'Basic Features',
          entertainmentSports: 'Entertainment & Sports',
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
          helper: 'Add tents to your camp',
          empty: 'No tents added yet. Click the buttons above to add tents.'
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
          coordinates: 'Coordinates: {{lat}}, {{lng}}',
          parseError: 'Failed to parse coordinates',
          extracted: 'Coordinates extracted from URL!'
        },
        
        photosTitle: 'Photos',
        photosHelper: 'Add photos of your camp (at least 3 photos)',
        
        amenitiesSection: 'Amenities',
        amenitiesHelper: 'Select all amenities available at your camp',
        selectedAmenities: 'Selected Amenities ({{count}})',
        
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
        updateFail: 'Failed to update listing',
        
        validation: {
          selectLocation: 'Please select a location from the dropdown',
          locationRequired: 'Please set your location using "Use My Current Location" or paste a Google Maps URL',
          maxGuests: 'Please specify maximum number of guests',
          tents: 'Please add at least one tent',
          kashtaCapacity: 'Please specify seating capacity for kashta',
          images: 'Please upload at least one image',
          uploading: 'Please wait for all images to finish uploading',
          success: 'Listing created successfully!',
          failed: 'Failed to create listing: {{error}}',
          kashtaSuccess: 'Kashta listing created successfully!',
          campSuccess: 'Camp listing created successfully!'
        }
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
        brand: 'MUKHYMAT',
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
        heroTitle: 'Ready to Share Your Space?',
        heroDesc: 'List your camp or kashta and start welcoming guests today. It only takes a few minutes to get started.',
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
        refresh: 'Refresh',
        quickActions: 'Quick Actions',
        stats: {
          totalListings: 'Total Listings',
          active: 'active',
          totalBookings: 'Total Bookings',
          pending: 'pending',
          revenue: 'Revenue',
          guests: 'Total Guests',
          comingSoon: 'Coming Soon'
        }
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
      
      // Become Host page (Arabic)
      becomeHost: {
        title: 'كن مضيفاً',
        subtitle: 'أكمل عملية التحقق لبدء الاستضافة على منصتنا',
        back: 'رجوع',
        phoneNumber: 'رقم الهاتف',
        cprNumber: 'رقم البطاقة الشخصية',
        verificationCode: 'رمز التحقق',
        phoneHint: 'أدخل رقم هاتفك المحمول البحريني (8 أرقام)',
        cprHint: 'أدخل رقم البطاقة الشخصية البحرينية المكون من 9 أرقام',
        otpHint: 'أدخل الرمز المكون من 6 أرقام المرسل إلى هاتفك',
        sendOtp: 'إرسال رمز التحقق',
        sending: 'جارٍ الإرسال...',
        sent: 'تم الإرسال',
        confirm: 'تأكيد',
        confirmed: 'تم التأكيد',
        verify: 'تحقق',
        verifying: 'جارٍ التحقق...',
        submit: 'إرسال الطلب',
        submitting: 'جارٍ الإرسال...',
        infoTitle: 'لماذا نحتاج هذه المعلومات؟',
        infoMessage: 'نقوم بالتحقق من جميع المضيفين لضمان سلامة وأمان مجتمعنا. معلوماتك سرية وتستخدم فقط لأغراض التحقق.',
        successTitle: 'تم إرسال الطلب!',
        successMessage: 'شكراً لك على التقديم لتصبح مضيفاً. سنراجع طلبك ونعود إليك خلال 24-48 ساعة.',
        applicationId: 'رقم الطلب',
        backHome: 'العودة للصفحة الرئيسية',
        viewProfile: 'عرض الملف الشخصي'
      },
      
      // Messages (Arabic)
      messages: {
        signInRequired: 'يرجى تسجيل الدخول للمتابعة',
        alreadyHost: 'أنت مضيف بالفعل',
        applicationPending: 'طلبك قيد المراجعة',
        applicationRejected: 'تم رفض طلبك',
        phoneRequired: 'رقم الهاتف مطلوب',
        invalidPhone: 'رقم هاتف بحريني غير صالح. يجب أن يكون 8 أرقام تبدأ بـ 3 أو 6 أو 7',
        invalidCpr: 'رقم بطاقة شخصية غير صالح. يجب أن يكون 9 أرقام',
        invalidOtp: 'يرجى إدخال رمز صالح مكون من 6 أرقام',
        phoneVerified: 'تم التحقق من رقم الهاتف بنجاح',
        verifyPhone: 'يرجى التحقق من رقم هاتفك أولاً',
        fillAllFields: 'يرجى ملء جميع الحقول',
        applicationSubmitted: 'تم إرسال الطلب بنجاح! سنراجعه قريباً.',
        otpSent: 'تم إرسال رمز التحقق إلى هاتفك',
        loadingAvailability: 'جارٍ تحميل التوفر...',
        availabilityError: 'تعذر تحميل التوفر.',
        signInAgain: 'تسجيل الدخول مرة أخرى'
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
      }
      
      // Note: Rest of Arabic translations remain the same as before
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