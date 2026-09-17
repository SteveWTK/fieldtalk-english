/* eslint-disable @typescript-eslint/no-unused-vars */
// Updated src/app/signup/page.js - Fix email confirmation flow
//
// The front-door companion to /signin. Prospects LAND here after
// following our marketing link, so this page shares the same dark
// slate substrate as the root landing and sign-in surface — one
// continuous "room" from marketing → sign-up → dashboard.
"use client";

import React, { Suspense, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Users, User } from "lucide-react";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { DEFAULT_EDITION } from "@/lib/editions/editions";

function SignUpPageContent() {
  const [step, setStep] = useState(1); // 1: Role selection, 2: Details form
  const [selectedRole, setSelectedRole] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    position: "",
    nationality: "",
    clubName: "",
    roleTitle: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signUp } = useAuth();
  const router = useRouter();
  // Edition tag — the explicit `?edition=` param wins (e.g. a partner
  // deep-link at /signup?edition=wc2026), otherwise fall to the
  // primary Global Player edition so no un-tagged signup can slip
  // through into a wrong-edition dashboard. See the DEFAULT_EDITION
  // export in editions.js for the source of truth.
  const searchParams = useSearchParams();
  const edition = searchParams.get("edition") || DEFAULT_EDITION;

  const roles = [
    {
      id: "player",
      title: "Football Player",
      description:
        "Access personalized English lessons and track your progress",
      icon: User,
      color: "from-accent-600 to-accent-500",
    },
    {
      id: "client_admin",
      title: "Coach / Club Admin",
      description: "Manage players and monitor team progress",
      icon: Users,
      color: "from-fieldtalk-600 to-fieldtalk-500",
    },
    // {
    //   id: "demo",
    //   title: "Demo Account",
    //   description: "Try the platform with sample data",
    //   icon: Shield,
    //   color: "from-purple-600 to-purple-500",
    // },
  ];

  const handleRoleSelection = (roleId) => {
    setSelectedRole(roleId);
    if (roleId === "demo") {
      // Handle demo account differently
      handleDemoSignup();
    } else {
      setStep(2);
    }
  };

  const handleDemoSignup = async () => {
    setLoading(true);
    setError("");

    // Create a unique demo email
    const timestamp = Date.now();
    const demoCredentials = {
      email: `demo_${timestamp}@fieldtalkenglish.com`,
      password: "demo123456",
      fullName: "Demo Player",
      user_type: "player",
    };

    const { user, error } = await signUp(
      demoCredentials.email,
      demoCredentials.password,
      {
        full_name: demoCredentials.fullName,
        user_type: demoCredentials.user_type,
        position: "Midfielder",
        nationality: "Demo Country",
      }
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      // For demo accounts, redirect with email parameter
      router.push(
        `/auth/check-email?email=${encodeURIComponent(demoCredentials.email)}`
      );
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const metadata = {
      full_name: formData.fullName,
      user_type: selectedRole,
    };

    if (selectedRole === "player") {
      metadata.position = formData.position;
      metadata.nationality = formData.nationality;
    } else if (selectedRole === "client_admin") {
      metadata.role_title = formData.roleTitle;
      metadata.club_name = formData.clubName;
    }

    // Always send an edition — the resolved value is either the
    // explicit ?edition= param or DEFAULT_EDITION. The DB trigger
    // reads user_metadata.edition and writes it to players.edition;
    // sending it every time guarantees the row is tagged correctly
    // regardless of what the trigger's own fallback is.
    metadata.edition = edition;

    const { user, error } = await signUp(
      formData.email,
      formData.password,
      metadata
    );

    if (error) {
      setError(error);
      setLoading(false);
    } else {
      // Redirect to check email page with email parameter
      router.push(
        `/auth/check-email?email=${encodeURIComponent(formData.email)}`
      );
    }
  };

  // Subtle ambient lime wash — matches the root landing + sign-in
  // so crossing this page feels like the same room.
  const AmbientWash = () => (
    <div className="absolute inset-0 pointer-events-none">
      <div
        className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
        style={{
          background:
            "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
        }}
      />
    </div>
  );

  // Step 1: Role Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
        <AmbientWash />
        <div className="relative z-10 max-w-2xl w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8 flex flex-col items-center">
            <GlobalPlayerLogo
              variant="crest"
              tone="tonalDark"
              size={64}
              sting="rise"
            />
            <h1 className="mt-4 text-3xl font-display font-bold text-primary-50 mb-2">
              Junte-se ao Global Player
            </h1>
            <p className="text-primary-400">
              Escolha o tipo de conta para começar
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelection(role.id)}
                disabled={loading}
                className="bg-primary-panel border border-primary-700 hover:border-primary-500 rounded-panel p-6 text-left transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${role.color} rounded-control flex items-center justify-center mb-4`}
                >
                  <role.icon className="w-6 h-6 text-primary-50" />
                </div>
                <h3 className="text-lg font-semibold text-primary-50 mb-2">
                  {role.title}
                </h3>
                <p className="text-sm text-primary-300">
                  {role.description}
                </p>
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-signal-alert/10 border border-signal-alert/40 text-signal-alert rounded-control text-sm text-center">
              {error}
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-primary-300">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-accent-400 hover:text-accent-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Details Form
  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex items-center justify-center p-4">
      <AmbientWash />
      <div className="relative z-10 max-w-md w-full">
        {/* Logo and Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <button
            onClick={() => setStep(1)}
            className="mt-4 text-accent-400 hover:text-accent-300 text-sm mb-4 transition-colors"
          >
            ← Change account type
          </button>
          <h1 className="text-2xl font-display font-bold text-primary-50 mb-2">
            {selectedRole === "player"
              ? "Player Registration"
              : "Coach Registration"}
          </h1>
        </div>

        {/* Registration Form */}
        <div className="bg-primary-panel border border-primary-700 rounded-panel p-6 sm:p-8">
          {error && (
            <div className="mb-4 p-3 bg-signal-alert/10 border border-signal-alert/40 text-signal-alert rounded-control text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="fullName"
              type="text"
              label="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              required
              placeholder="Your full name"
            />

            {selectedRole === "player" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary-400 mb-1.5">
                    Position
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    className="w-full px-[15px] py-[13px] border border-primary-600 rounded-control bg-primary-900 text-primary-100 font-sans text-[15px] leading-normal outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-400/30 transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="Goalkeeper">Goalkeeper</option>
                    <option value="Defender">Defender</option>
                    <option value="Midfielder">Midfielder</option>
                    <option value="Forward">Forward</option>
                  </select>
                </div>
                <Input
                  name="nationality"
                  type="text"
                  label="Nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  required
                  placeholder="Your nationality"
                />
              </div>
            )}

            {selectedRole === "client_admin" && (
              <div className="space-y-4">
                <Input
                  name="clubName"
                  type="text"
                  label="Club/Organization Name"
                  value={formData.clubName}
                  onChange={handleChange}
                  required
                  placeholder="Your club or organization"
                />
                <Input
                  name="roleTitle"
                  type="text"
                  label="Your Role"
                  value={formData.roleTitle}
                  onChange={handleChange}
                  placeholder="e.g., Head Coach, Academy Director"
                  required
                />
              </div>
            )}

            <Input
              name="email"
              type="email"
              label="Email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your.email@example.com"
            />

            <Input
              name="password"
              type="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="Minimum 6 characters"
            />

            <p className="text-xs text-primary-400 text-center mt-4">
              By signing up, you agree to our{" "}
              <Link
                href="/terms"
                className="text-accent-400 hover:text-accent-300 hover:underline transition-colors"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="text-accent-400 hover:text-accent-300 hover:underline transition-colors"
              >
                Privacy Policy
              </Link>
            </p>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="w-full"
              IconTrailing={loading ? undefined : ArrowRight}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-primary-300">
              Already have an account?{" "}
              <Link
                href="/signin"
                className="text-accent-400 hover:text-accent-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary, otherwise Next.js opts the
// whole route out of static rendering and Vercel's build fails.
export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpPageContent />
    </Suspense>
  );
}

// // src/app/auth/signup/page.js
// "use client";

// import React, { useState } from "react";
// import { useAuth } from "@/components/AuthProvider";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import { Globe, ArrowRight } from "lucide-react";

// export default function SignUpPage() {
//   const [formData, setFormData] = useState({
//     email: "",
//     password: "",
//     fullName: "",
//     position: "",
//     nationality: "",
//   });
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const { signUp } = useAuth();
//   const router = useRouter();

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     const { user, error } = await signUp(formData.email, formData.password, {
//       full_name: formData.fullName,
//       position: formData.position,
//       nationality: formData.nationality,
//     });

//     if (error) {
//       setError(error);
//       setLoading(false);
//     } else {
//       // Redirect to check email page instead of dashboard
//       router.push("/auth/check-email");
//     }
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
//           <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
//             Join FieldTalk
//           </h1>
//           <p className="text-gray-600 dark:text-gray-300">
//             Start your English learning journey today
//           </p>
//         </div>

//         {/* Sign Up Form */}
//         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
//           {error && (
//             <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
//               {error}
//             </div>
//           )}

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label
//                 htmlFor="fullName"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Full Name
//               </label>
//               <input
//                 id="fullName"
//                 name="fullName"
//                 type="text"
//                 value={formData.fullName}
//                 onChange={handleChange}
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="João Silva"
//               />
//             </div>

//             <div className="grid grid-cols-2 gap-4">
//               <div>
//                 <label
//                   htmlFor="position"
//                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//                 >
//                   Position
//                 </label>
//                 <select
//                   id="position"
//                   name="position"
//                   value={formData.position}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 >
//                   <option value="">Select...</option>
//                   <option value="Goalkeeper">Goalkeeper</option>
//                   <option value="Defender">Defender</option>
//                   <option value="Midfielder">Midfielder</option>
//                   <option value="Forward">Forward</option>
//                 </select>
//               </div>

//               <div>
//                 <label
//                   htmlFor="nationality"
//                   className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//                 >
//                   Nationality
//                 </label>
//                 <input
//                   id="nationality"
//                   name="nationality"
//                   type="text"
//                   value={formData.nationality}
//                   onChange={handleChange}
//                   required
//                   className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                   placeholder="Brazil"
//                 />
//               </div>
//             </div>

//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Email
//               </label>
//               <input
//                 id="email"
//                 name="email"
//                 type="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 required
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="player@club.com"
//               />
//             </div>

//             <div>
//               <label
//                 htmlFor="password"
//                 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
//               >
//                 Password
//               </label>
//               <input
//                 id="password"
//                 name="password"
//                 type="password"
//                 value={formData.password}
//                 onChange={handleChange}
//                 required
//                 minLength={6}
//                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
//                 placeholder="Minimum 6 characters"
//               />
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className="w-full bg-gradient-to-r from-blue-600 to-green-500 text-white py-3 px-4 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
//             >
//               <span>{loading ? "Creating account..." : "Create Account"}</span>
//               {!loading && <ArrowRight className="w-4 h-4" />}
//             </button>
//           </form>

//           <div className="mt-6 text-center">
//             <p className="text-sm text-gray-600 dark:text-gray-300">
//               Already have an account?{" "}
//               <Link
//                 href="/auth/signin"
//                 className="text-blue-600 hover:text-blue-700 font-medium"
//               >
//                 Sign in
//               </Link>
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
