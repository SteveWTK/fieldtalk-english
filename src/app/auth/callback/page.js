// FIXED src/app/auth/callback/page.js
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Globe, Loader } from "lucide-react";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Completing your sign in...");
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();

      try {
        console.log("🔍 Starting OAuth callback process...");
        console.log("Current URL:", window.location.href);

        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("❌ OAuth callback error:", error);
          setStatus("error");
          setMessage(error.message);
          return;
        }

        console.log("📊 Session data:", data);

        if (data.session) {
          console.log("✅ Valid session found, user authenticated");
          setStatus("success");
          setMessage("Sign in successful! Redirecting...");

          // Redirect to lesson page after short delay
          setTimeout(() => {
            router.push("/lesson");
          }, 1500);
        } else {
          console.log("❌ No session found");
          setStatus("error");
          setMessage("Authentication failed. Please try again.");
        }
      } catch (error) {
        console.error("❌ Unexpected error in auth callback:", error);
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    handleAuthCallback();
  }, [router]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-4">{message}</p>
          <div className="space-y-2">
            <button
              onClick={() => router.push("/signin")}
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="block w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">
            FieldTalk English
          </span>
        </div>

        <div className="bg-white p-8 rounded-xl shadow-lg">
          <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {status === "success" ? "Success!" : "Completing your sign in..."}
          </h1>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

// src/app/auth/callback/page.js - Handle OAuth callbacks
// "use client";

// import React, { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import { createClient } from "@/lib/supabase/client";
// import { Globe, Loader } from "lucide-react";

// export default function AuthCallbackPage() {
//   const [status, setStatus] = useState("loading");
//   const router = useRouter();

//   useEffect(() => {
//     const handleAuthCallback = async () => {
//       const supabase = createClient();

//       try {
//         const { data, error } = await supabase.auth.getSession();

//         if (error) {
//           console.error("Auth callback error:", error);
//           setStatus("error");
//           return;
//         }

//         if (data.session) {
//           // User is authenticated, redirect to dashboard
//           router.push("/dashboard");
//         } else {
//           // No session, redirect to signin
//           router.push("/auth/signin");
//         }
//       } catch (error) {
//         console.error("Unexpected error in auth callback:", error);
//         setStatus("error");
//       }
//     };

//     handleAuthCallback();
//   }, [router]);

//   if (status === "error") {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
//         <div className="text-center">
//           <h1 className="text-2xl font-bold text-gray-900 mb-4">
//             Authentication Error
//           </h1>
//           <p className="text-gray-600 mb-4">
//             There was a problem signing you in.
//           </p>
//           <a
//             href="/auth/signin"
//             className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
//           >
//             Try Again
//           </a>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
//       <div className="text-center">
//         <div className="flex items-center justify-center space-x-2 mb-4">
//           <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
//             <Globe className="w-6 h-6 text-white" />
//           </div>
//           <span className="text-2xl font-bold text-gray-900">
//             FieldTalk English
//           </span>
//         </div>
//         <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
//         <p className="text-gray-600">Completing your sign in...</p>
//       </div>
//     </div>
//   );
// }
