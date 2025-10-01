"use client";

import Link from "next/link";

export default function landingPageHome() {
  return (
    // <div className="w-full flex justify-center bg-white dark:bg-primary-950">
    //   <img src="/landing/Habitat-landing-slogan.png" alt="Hero" className="" />
    // </div>
    <div className="relative transform-3d bg-white dark:bg-primary-900">
      <div className="top-1/2 left-1/2 flex justify-center rounded-b-xl bg-white dark:bg-primary-900">
        <img
          src="/images/hero/Fieldtalk-landing.png"
          alt="FieldTalk Hero Image"
          className="lg:px-32"
        />
        {/* <img
          src="/landing/Habitat-landing-mobile-5.png"
          alt="Hero"
          className="object-top h-10/12 overflow-hidden sm:hidden"
        /> */}
      </div>
      <div className="flex justify-center gap-8 pt-4 pb-4">
        <Link href="/schools">
          <p className="block sm:invisible text-[10px] md:text-[12px] xl:text-sm  text-primary-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-200 border-b-1 px-2 py-1 border-primary-900 hover:border-accent-600 dark:border-white dark:hover:border-accent-200 rounded-xl hover:translate-z-192">
            {" "}
            FOR SCHOOLS
          </p>
        </Link>
        <Link href="/explorers">
          <p className="block sm:invisible text-[10px] md:text-[12px] xl:text-sm  text-primary-900 hover:text-accent-600 dark:text-white dark:hover:text-accent-200 border-b-1 px-2 py-1 border-primary-900 hover:border-accent-600 dark:border-white dark:hover:border-accent-200 rounded-xl hover:translate-z-192">
            {" "}
            SOLO EXPLORERS
          </p>
        </Link>
      </div>
    </div>
  );
}
