import Image from "next/image";
import Link from "next/link";
import logoH from "/logos/FieldTalk-wide-lm-a7.png";

export default function HeaderLogoDark() {
  return (
    <div className="relative">
      <Link href="/" className="flex items-center gap-4 z-10">
        {/* <Image
          src={logoC}
          height="auto"
          width="140"
          quality={100}
          alt="Neptune's Tribe logo"
          className="lg:hidden"
        /> */}
        {/* <Image
          src={logoL}
          height="auto"
          width="140"
          quality={100}
          alt="Neptune's Tribe logo"
          // className="hidden lg:block"
        /> */}
        <Image
          src={logoH}
          height="auto"
          width="130"
          quality={100}
          alt="FieldTalk logo"
          className="block rounded-tr-3xl rounded-bl-3xl"
        />
      </Link>
    </div>
  );
}
