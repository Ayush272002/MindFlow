"use client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { Separator } from "../ui/separator";

type NavbarProps = {
  loggedIn: boolean;
};

export default function Navbar({ loggedIn }: NavbarProps) {
  return (
    <nav className="sticky top-0 w-full backdrop-blur-md bg-white/75 border-b border-gray-200/20 z-50">
      <div className="container mx-auto px-4">
        <div className="h-20 flex items-center justify-between">
          <Link href="/">
            <motion.img
              src="/logo.svg"
              alt="MindFlow"
              className="h-6"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </Link>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {!loggedIn && (
              <Button variant="outline" className="px-6 py-2 rounded-xl">
                Login
              </Button>
            )}
            {loggedIn && (
              <Link href="/">
                <Button variant="outline" className="px-6 py-2 rounded-xl">
                  Sign out
                </Button>
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      <Separator />
    </nav>
  );
}
