// src/app/terms/page.js
export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            Terms of Service
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
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 mb-4">
                By accessing and using FieldTalk English (&quot;the
                Service&quot;), you accept and agree to be bound by the terms
                and provision of this agreement. If you do not agree to abide by
                the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-700 mb-4">
                FieldTalk English is an online English learning platform
                specifically designed for football players. We provide
                interactive lessons, assessments, and progress tracking to help
                football professionals improve their English communication
                skills.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. User Account
              </h2>
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Account Creation
                </h3>
                <ul className="list-disc pl-6 text-gray-700 space-y-1">
                  <li>
                    You must provide accurate and complete information when
                    creating an account
                  </li>
                  <li>
                    You are responsible for maintaining the confidentiality of
                    your account credentials
                  </li>
                  <li>
                    You must be at least 13 years old to create an account
                  </li>
                  <li>One person may not maintain more than one account</li>
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Account Responsibility
                </h3>
                <p className="text-gray-700">
                  You are responsible for all activities that occur under your
                  account. Notify us immediately of any unauthorized use of your
                  account.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Subscription and Payment
              </h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Some features require a paid subscription</li>
                <li>
                  Subscription fees are billed in advance on a recurring basis
                </li>
                <li>
                  All payments are non-refundable except as required by law
                </li>
                <li>Prices may change with 30 days notice</li>
                <li>You may cancel your subscription at any time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Acceptable Use
              </h2>
              <p className="text-gray-700 mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use the service for any unlawful purpose</li>
                <li>Share your account credentials with others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Upload malicious code or viruses</li>
                <li>Harass, abuse, or harm other users</li>
                <li>
                  Reproduce, distribute, or create derivative works of our
                  content without permission
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Intellectual Property
              </h2>
              <p className="text-gray-700 mb-4">
                All content on FieldTalk English, including but not limited to
                text, graphics, logos, audio clips, and software, is the
                property of FieldTalk English or its content suppliers and is
                protected by copyright and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Privacy Policy
              </h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our Privacy
                Policy, which also governs your use of the service, to
                understand our practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Service Availability
              </h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain service availability but do not guarantee
                uninterrupted access. We may suspend or terminate the service
                for maintenance, updates, or other reasons.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-gray-700 mb-4">
                FieldTalk English shall not be liable for any indirect,
                incidental, special, or consequential damages resulting from
                your use of the service, even if we have been advised of the
                possibility of such damages.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Termination
              </h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account at any time for
                violations of these terms. Upon termination, your right to use
                the service will cease immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to modify these terms at any time. Changes
                will be effective when posted on our website. Your continued use
                of the service after changes constitutes acceptance of the new
                terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Governing Law
              </h2>
              <p className="text-gray-700 mb-4">
                These terms shall be governed by and construed in accordance
                with the laws of [Your Jurisdiction], without regard to its
                conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms of Service, please
                contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> legal@fieldtalkenglish.com
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
