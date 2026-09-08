"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import birthdayHat from "@/public/birthday-hat.svg";

interface BirthdayUser {
  id: string;
  name: string;
  photoUrl?: string;
  dob?: string; // e.g. "1996-09-08" or "08 September 1996"
}

// Helper: Extract only first name
const getFirstName = (fullName: string) => {
  if (!fullName) return "Employee";
  return fullName.trim().split(" ")[0];
};

// Helper: Check if DOB matches today (Day & Month)
const isBirthdayToday = (dobStr?: string): boolean => {
  if (!dobStr) return false;

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth(); // 0-indexed (0 = Jan, 8 = Sep)

  // 1. Try direct Date parsing (e.g. "1996-09-08" or "08 September 1996")
  const parsedDate = new Date(dobStr);
  if (!isNaN(parsedDate.getTime())) {
    return (
      parsedDate.getDate() === currentDay &&
      parsedDate.getMonth() === currentMonth
    );
  }

  // 2. Fallback: Parse "DD/MM/YYYY" or "YYYY-MM-DD" manually
  const parts = dobStr.split(/[-/.\s]+/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0], 10) || parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10) - 1;
    return day === currentDay && month === currentMonth;
  }

  return false;
};

const BirthdayBanner = () => {
  const [birthdayUsers, setBirthdayUsers] = useState<BirthdayUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to active users
    const q = query(collection(db, "users"), where("isActive", "==", true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const todayBirthdays: BirthdayUser[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (isBirthdayToday(data.dob)) {
            todayBirthdays.push({
              id: docSnap.id,
              name: data.name || "Employee",
              photoUrl: data.photoUrl,
              dob: data.dob,
            });
          }
        });

        setBirthdayUsers(todayBirthdays);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching birthday users:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Hide component completely if no birthdays today or while loading
  if (loading || birthdayUsers.length === 0) return null;

  return (
    <div className="w-full font-poppins text-black flex flex-col gap-3 mb-6">
      {birthdayUsers.map((person) => {
        const firstName = getFirstName(person.name);
        const avatarSrc = person.photoUrl;

        return (
          <div
            key={person.id}
            className="border border-neutral-300 bg-transparent px-2.5 py-2 flex items-center justify-between gap-4"
          >
            {/* Left: Birthday Person Photo & Text */}
            <div className="flex items-center gap-4">
              {/* Profile Photo */}
              <div className="relative w-10 h-10 overflow-hidden shrink-0 bg-stone-800">
                <Image
                  src={avatarSrc as string}
                  alt={`${person.name}'s profile`}
                  //   width={22}
                  //   height={22}
                  className="w-full h-full object-contain"
                  fill
                />
              </div>

              {/* Birthday Text */}
              <h3 className="text-sm text-[#231F20] font-normal tracking-wide">
                Today is{" "}
                <span className="font-bold text-[#231F20]">
                  {firstName}&apos;s birthday
                </span>
              </h3>
            </div>

            {/* Right: Party Popper Celebration Emoji / Icon */}
            <div className="text-2xl md:text-3xl select-none pr-2">
              <Image src={birthdayHat} alt="" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BirthdayBanner;
