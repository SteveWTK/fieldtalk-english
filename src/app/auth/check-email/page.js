/* eslint-disable @typescript-eslint/no-unused-vars */
// FIXED src/app/auth/check-email/page.js
"use client";

import React, { useState, Suspense } from "react";
import { Globe, Mail, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useSearchParams } from "next/navigation";

// Separate component that uses useSearchParams
function CheckEmailContent() {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const { resendConfirmation } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleResendEmail = async () => {
    if (!email) {
      setResendMessage("Email address not found. Please try signing up again.");
      return;
    }

    setIsResending(true);
    setResendMessage("");

    const { data, error } = await resendConfirmation(email);

    if (error) {
      setResendMessage(`Error: ${error}`);
    } else {
      setResendMessage("Confirmation email sent! Please check your inbox.");
    }

    setIsResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              FieldTalk English
            </span>
          </div>
        </div>

        {/* Check Email Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Check Your Email
          </h1>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            We&apos;ve sent you a confirmation email{email && ` to ${email}`}.
            Please check your inbox and click the confirmation link to activate
            your account.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Didn&apos;t receive the email?</strong>
              <br />
              • Check your spam/junk folder
              <br />
              • Make sure you entered the correct email address
              <br />• Wait a few minutes and refresh your inbox
            </p>
          </div>

          {resendMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                resendMessage.includes("Error")
                  ? "bg-red-100 border border-red-400 text-red-700"
                  : "bg-green-100 border border-green-400 text-green-700"
              }`}
            >
              {resendMessage}
            </div>
          )}

          <div className="space-y-3">
            {email && (
              <button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
                />
                <span>{isResending ? "Sending..." : "Resend Email"}</span>
              </button>
            )}

            <Link
              href="/auth/signin"
              className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/auth/signup"
              className="block w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2"
            >
              Need to sign up again?
            </Link>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Still having trouble? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback component
function CheckEmailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              FieldTalk English
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Loading...
          </h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailLoading />}>
      <CheckEmailContent />
    </Suspense>
  );
}

// /* eslint-disable @typescript-eslint/no-unused-vars */
// // NEW: Updated check-email page with resend functionality
// // src/app/auth/check-email/page.js
// "use client";

// import React, { useState } from "react";
// import { Globe, Mail, ArrowRight, RefreshCw } from "lucide-react";
// import Link from "next/link";
// import { useAuth } from "@/components/AuthProvider";
// import { useSearchParams } from "next/navigation";

// export default function CheckEmailPage() {
//   const [isResending, setIsResending] = useState(false);
//   const [resendMessage, setResendMessage] = useState("");
//   const { resendConfirmation } = useAuth();
//   const searchParams = useSearchParams();
//   const email = searchParams.get("email");

//   const handleResendEmail = async () => {
//     if (!email) {
//       setResendMessage("Email address not found. Please try signing up again.");
//       return;
//     }

//     setIsResending(true);
//     setResendMessage("");

//     const { data, error } = await resendConfirmation(email);

//     if (error) {
//       setResendMessage(`Error: ${error}`);
//     } else {
//       setResendMessage("Confirmation email sent! Please check your inbox.");
//     }

//     setIsResending(false);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
//       <div className="max-w-md w-full">
//         {/* Logo and Header */}
//         <div className="text-center mb-8">
//           <div className="flex items-center justify-center space-x-2 mb-4">
//             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
//               <Globe className="w-6 h-6 text-white" />
//             </div>
//             <span className="text-2xl font-bold text-gray-900 dark:text-white">
//               FieldTalk English
//             </span>
//           </div>
//         </div>

//         {/* Check Email Content */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
//           <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
//             <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
//           </div>

//           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
//             Check Your Email
//           </h1>

//           <p className="text-gray-600 dark:text-gray-300 mb-6">
//             We&apos;ve sent you a confirmation email{email && ` to ${email}`}.
//             Please check your inbox and click the confirmation link to activate
//             your account.
//           </p>

//           <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6">
//             <p className="text-sm text-blue-800 dark:text-blue-200">
//               <strong>Didn&apos;t receive the email?</strong>
//               <br />
//               • Check your spam/junk folder
//               <br />
//               • Make sure you entered the correct email address
//               <br />• Wait a few minutes and refresh your inbox
//             </p>
//           </div>

//           {resendMessage && (
//             <div
//               className={`mb-4 p-3 rounded-lg text-sm ${
//                 resendMessage.includes("Error")
//                   ? "bg-red-100 border border-red-400 text-red-700"
//                   : "bg-green-100 border border-green-400 text-green-700"
//               }`}
//             >
//               {resendMessage}
//             </div>
//           )}

//           <div className="space-y-3">
//             {email && (
//               <button
//                 onClick={handleResendEmail}
//                 disabled={isResending}
//                 className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
//               >
//                 <RefreshCw
//                   className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`}
//                 />
//                 <span>{isResending ? "Sending..." : "Resend Email"}</span>
//               </button>
//             )}

//             <Link
//               href="/auth/signin"
//               className="flex items-center justify-center space-x-2 w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
//             >
//               <span>Back to Sign In</span>
//               <ArrowRight className="w-4 h-4" />
//             </Link>

//             <Link
//               href="/auth/signup"
//               className="block w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2"
//             >
//               Need to sign up again?
//             </Link>
//           </div>
//         </div>

//         {/* Additional Help */}
//         <div className="mt-6 text-center">
//           <p className="text-xs text-gray-500 dark:text-gray-400">
//             Still having trouble? Contact our support team for assistance.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
