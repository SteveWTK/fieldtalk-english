export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">FT</span>
              </div>
              <span className="text-xl font-bold">FieldTalk English</span>
            </div>
            <p className="text-gray-300 mb-4">
              Professional English training designed specifically for football
              players worldwide.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="/features" className="hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="/pricing" className="hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/demo" className="hover:text-white">
                  Demo
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-gray-300">
              <li>
                <a href="/privacy" className="hover:text-white">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="/terms" className="hover:text-white">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/contact" className="hover:text-white">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 FieldTalk English. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a
              href="/privacy"
              className="text-gray-400 hover:text-white text-sm"
            >
              Privacy
            </a>
            <a href="/terms" className="text-gray-400 hover:text-white text-sm">
              Terms
            </a>
            <a
              href="/contact"
              className="text-gray-400 hover:text-white text-sm"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
