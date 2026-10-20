import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="display text-[5rem] font-black leading-none text-court">Out</p>
      <h1 className="mt-4 text-[1.4rem] font-semibold">No game with that code</h1>
      <p className="mt-2 text-ink-2">
        Check the code on the court&rsquo;s screen and try again. Codes stop working once everyone has left the court.
      </p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-ink px-6 font-semibold text-white">
        Back to Discover
      </Link>
    </div>
  );
}
