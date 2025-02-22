import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Navbar */}
      <nav className="sticky top-0 w-full backdrop-blur-md bg-white/75 border-b border-gray-200/20 z-50">
        <div className="container mx-auto px-4">
          <div className="h-20 flex items-center justify-between">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
              MindFlow
            </span>
            <Button variant="outline" className="px-6 py-2 rounded-xl">
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* hero section */}
      <section className="container mx-auto px-4 py-32 flex flex-col items-center">
        <div className="max-w-4xl text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 mb-8">
            Learn anything.
            <span className="block mt-2 pb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-violet-600">
              Your way.
            </span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Upload your content. Let AI make it interactive.
            Learn at your own pace.
          </p>
          <div className="flex gap-6 justify-center">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white px-12 py-8 text-xl rounded-2xl">
              Start Now
            </Button>
            <Button variant="outline" className="px-12 py-8 text-xl rounded-2xl border-2">
              Leaderboard
            </Button>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="container mx-auto px-8 md:px-12 lg:px-16 py-24 bg-white rounded-[2.5rem] my-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="h-16 w-16 bg-blue-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="text-2xl font-semibold">Drop Any Content</h3>
            <p className="text-gray-600 text-lg">
              PDFs, slides, videos, notes - we&apos;ll make them interactive.
            </p>
          </div>

          <div className="space-y-4">
            <div className="h-16 w-16 bg-violet-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-2xl font-semibold">Learn Your Way</h3>
            <p className="text-gray-600 text-lg">
              Content adapts to how you learn best.
            </p>
          </div>

          <div className="space-y-4">
            <div className="h-16 w-16 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-3xl">✨</span>
            </div>
            <h3 className="text-2xl font-semibold">Make It Stick</h3>
            <p className="text-gray-600 text-lg">
              Quizzes, flashcards, and visual maps that work.
            </p>
          </div>
        </div>
      </section>

      {/* User journey breakdown */}
      <section className="container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto space-y-16">
          <div className="flex gap-8 items-start">
            <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-3">Drop Your Content</h3>
              <p className="text-gray-600 text-lg">
                Drag and drop any learning material. That&apos;s it.
              </p>
            </div>
          </div>
          
          <div className="flex gap-8 items-start">
            <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-3">AI Does Its Thing</h3>
              <p className="text-gray-600 text-lg">
                We turn it into bite-sized, interactive pieces.
              </p>
            </div>
          </div>
          
          <div className="flex gap-8 items-start">
            <div className="h-12 w-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-3">Start Learning</h3>
              <p className="text-gray-600 text-lg">
                Jump in and learn. We&apos;ll adapt to your style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-32">
        <div className="bg-gray-900 text-white rounded-[2.5rem] p-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            Ready to learn differently?
          </h2>
          <Button className="bg-white text-gray-900 hover:bg-gray-100 px-12 py-8 text-xl rounded-2xl">
            Get Started
          </Button>
        </div>
      </section>
    </main>
  )
}
