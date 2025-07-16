// src/app/privacy/page.js
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              <strong>Effective Date:</strong>{" "}
              {new Date().toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 mb-4">
                Welcome to FieldTalk English (&quot;we,&quot; &quot;our,&quot;
                or &quot;us&quot;). We are committed to protecting your personal
                information and your right to privacy. This Privacy Policy
                explains how we collect, use, and safeguard your information
                when you use our English learning platform designed for football
                players.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Personal Information
                </h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Name and contact information (email address)</li>
                  <li>Profile information (nationality, playing position)</li>
                  <li>Club affiliation (if applicable)</li>
                  <li>Learning progress and performance data</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Usage Data
                </h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>Lesson completion data</li>
                  <li>Time spent on activities</li>
                  <li>Assessment scores and progress tracking</li>
                  <li>Device and browser information</li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide and maintain our educational services</li>
                <li>Personalize your learning experience</li>
                <li>Track your progress and provide feedback</li>
                <li>
                  Communicate with you about your account and our services
                </li>
                <li>Improve our platform and develop new features</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Information Sharing
              </h2>
              <p className="text-gray-700 mb-4">
                We do not sell, trade, or otherwise transfer your personal
                information to third parties, except in the following
                circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>With your explicit consent</li>
                <li>
                  With your club or organization (if you&apos;re enrolled
                  through them)
                </li>
                <li>To comply with legal requirements</li>
                <li>To protect our rights, property, or safety</li>
                <li>
                  With trusted service providers who assist us in operating our
                  platform
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Data Security
              </h2>
              <p className="text-gray-700 mb-4">
                We implement appropriate technical and organizational security
                measures to protect your personal information against
                unauthorized access, alteration, disclosure, or destruction.
                This includes encryption, secure servers, and regular security
                assessments.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Your Rights
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Access and receive a copy of your personal data</li>
                <li>Rectify inaccurate personal data</li>
                <li>Erase your personal data</li>
                <li>Restrict processing of your personal data</li>
                <li>Data portability</li>
                <li>Object to processing of your personal data</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Cookies and Tracking
              </h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar tracking technologies to enhance your
                experience on our platform. You can control cookie settings
                through your browser preferences.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Children&apos;s Privacy
              </h2>
              <p className="text-gray-700 mb-4">
                Our service is not intended for children under 13 years of age.
                We do not knowingly collect personal information from children
                under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Changes to This Policy
              </h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the &quot;Effective Date.&quot;
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Contact Us
              </h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about this Privacy Policy, please
                contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> privacy@fieldtalkenglish.com
                  <br />
                  <strong>Address:</strong> [Your Business Address]
                  <br />
                  <strong>Website:</strong> https://fieldtalk-english.vercel.app
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
