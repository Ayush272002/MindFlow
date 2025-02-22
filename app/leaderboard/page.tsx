"use client"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useState } from "react"
import { Search, ChevronDown } from "lucide-react"
import Navbar from "@/components/custom/navbar"
import Link from "next/link"

const fadeInUp = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1],
  },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

// Mock data for the leaderboard
const leaderboardData = [
  { rank: 1, name: "Alex Johnson", level: 42, xp: 15780, avatar: "https://i.pravatar.cc/150?img=1" },
  { rank: 2, name: "Emma Watson", level: 39, xp: 14200, avatar: "https://i.pravatar.cc/150?img=2" },
  { rank: 3, name: "Michael Brown", level: 37, xp: 13450, avatar: "https://i.pravatar.cc/150?img=3" },
  { rank: 4, name: "Sophia Lee", level: 35, xp: 12800, avatar: "https://i.pravatar.cc/150?img=4" },
  { rank: 5, name: "Daniel Kim", level: 33, xp: 11900, avatar: "https://i.pravatar.cc/150?img=5" },
  { rank: 6, name: "Olivia Garcia", level: 31, xp: 11200, avatar: "https://i.pravatar.cc/150?img=6" },
  { rank: 7, name: "William Chen", level: 29, xp: 10500, avatar: "https://i.pravatar.cc/150?img=7" },
  { rank: 8, name: "Ava Martinez", level: 27, xp: 9800, avatar: "https://i.pravatar.cc/150?img=8" },
  { rank: 9, name: "James Wilson", level: 25, xp: 9100, avatar: "https://i.pravatar.cc/150?img=9" },
  { rank: 10, name: "Isabella Taylor", level: 23, xp: 8400, avatar: "https://i.pravatar.cc/150?img=10" },
]

export default function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("rank")

  const filteredData = leaderboardData
    .filter((user) => user.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "rank") return a.rank - b.rank
      if (sortBy === "level") return b.level - a.level
      if (sortBy === "xp") return b.xp - a.xp
      return 0
    })

  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Navbar */}
      <Navbar loggedIn={true} />

      {/* Leaderboard header */}
      <section className="container mx-auto px-4 pt-16 pb-8">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial="initial"
          animate="animate"
          variants={staggerContainer}
        >
          <motion.h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6" variants={fadeInUp}>
            Leaderboard
          </motion.h1>
          <motion.p className="text-xl text-gray-600 mb-12" variants={fadeInUp}>
            See how you stack up against other learners!
          </motion.p>
        </motion.div>
      </section>

      {/* Leaderboard controls */}
      <section className="container mx-auto px-4 mb-8">
        <motion.div
          className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div className="relative w-full sm:w-64" variants={fadeInUp}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>
          <motion.div className="relative w-full sm:w-48" variants={fadeInUp}>
            <select
              className="w-full appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="rank">Sort by Rank</option>
              <option value="level">Sort by Level</option>
              <option value="xp">Sort by XP</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </motion.div>
        </motion.div>
      </section>

      {/* Leaderboard table */}
      <section className="container mx-auto px-4 py-8">
        <motion.div
          className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-lg overflow-hidden"
          variants={scaleIn}
          initial="initial"
          animate="animate"
        >
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">XP</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((user, index) => (
                <motion.tr
                  key={user.rank}
                  variants={fadeInUp}
                  custom={index}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: index * 0.05 }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.rank}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.avatar || "/placeholder.svg"} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.level}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.xp.toLocaleString()}</div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          className="bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-[2.5rem] p-16 text-center"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{
            duration: 0.8,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <motion.h2
            className="text-3xl md:text-4xl font-bold mb-8"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.2,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            Ready to climb the ranks?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.4,
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link href="/learn">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 px-12 py-6 text-xl rounded-2xl font-semibold">
                Start Learning
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

