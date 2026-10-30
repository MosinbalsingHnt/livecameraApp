const fs = require("fs");
const path = require("path");

const structure = [



    "src",







    "src/assets/images",



    "src/assets/icons",



    "src/assets/fonts",



    "src/assets/animations",







    "src/components/Button",



    "src/components/Card",



    "src/components/Header",



    "src/components/Input",



    "src/components/Loader",



    "src/components/Modal",







    "src/navigation",







    "src/services/api",



    "src/services/bluetooth",



    "src/services/storage",



    "src/services/notifications",



    "src/services/permissions",







    "src/hooks",



    "src/utils",



    "src/constants",



    "src/theme",



    "src/store",



    "src/types",







    "src/features/auth/api",



    "src/features/auth/hooks",



    "src/features/auth/components",



    "src/features/auth/screens",



    "src/features/auth/schemas",







    "src/features/dashboard/api",



    "src/features/dashboard/hooks",



    "src/features/dashboard/components",



    "src/features/dashboard/screens",







    "src/features/profile/api",



    "src/features/profile/hooks",



    "src/features/profile/components",



    "src/features/profile/screens",







    "src/features/health/api",



    "src/features/health/hooks",



    "src/features/health/components",



    "src/features/health/screens",







    "src/features/bluetooth/api",



    "src/features/bluetooth/hooks",



    "src/features/bluetooth/components",



    "src/features/bluetooth/screens",



    "src/features/bluetooth/services",







    "src/features/settings",



    "src/features/notifications",



    "src/features/coach",



];

const files = [



    "src/navigation/AppNavigator.tsx",



    "src/navigation/AuthNavigator.tsx",



    "src/navigation/BottomTabNavigator.tsx",



    "src/navigation/RootNavigator.tsx",



    "src/navigation/types.ts",







    "src/services/api/axios.ts",



    "src/services/api/interceptors.ts",



    "src/services/api/queryClient.ts",







    "src/App.tsx",







    "src/features/auth/screens/LoginScreen.tsx",



    "src/features/auth/screens/RegisterScreen.tsx",



    "src/features/auth/screens/ForgotPasswordScreen.tsx",



    "src/features/auth/screens/OTPVerificationScreen.tsx",







    "src/features/dashboard/screens/DashboardScreen.tsx",







    "src/features/profile/screens/ProfileScreen.tsx",



    "src/features/profile/screens/EditProfileScreen.tsx",







    "src/features/health/screens/HealthDashboardScreen.tsx",



    "src/features/health/screens/HeartRateScreen.tsx",



    "src/features/health/screens/SleepScreen.tsx",



    "src/features/health/screens/StepsScreen.tsx",







    "src/features/bluetooth/screens/DeviceScanScreen.tsx",



    "src/features/bluetooth/screens/PairDeviceScreen.tsx",



    "src/features/bluetooth/screens/DeviceDetailsScreen.tsx",



];

structure.forEach((folder) => {
    fs.mkdirSync(path.join(__dirname, folder), { recursive: true });
});

files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "");
    }
});

console.log("✅ React Native folder structure created successfully.");