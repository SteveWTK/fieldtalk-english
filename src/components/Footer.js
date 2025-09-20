export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-3 border-t border-gray-700 ">
      <div className="px-8 flex flex-col md:flex-row justify-between items-center">
        <p className="text-gray-400 text-sm">
          © 2025 FieldTalk English. All rights reserved.
        </p>
        <div className="flex space-x-6 mt-4 md:mt-0">
          <a href="/privacy" className="text-gray-400 hover:text-white text-sm">
            Privacy
          </a>
          <a href="/terms" className="text-gray-400 hover:text-white text-sm">
            Terms
          </a>
          <a href="/contact" className="text-gray-400 hover:text-white text-sm">
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}
