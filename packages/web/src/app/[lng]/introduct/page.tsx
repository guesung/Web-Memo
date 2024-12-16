'use client';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button } from '@extension/ui';

export default function IntroductPage() {
  return (
    <div className="bg-background min-h-screen">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-gray-800">PageSummary</div>
          <div className="space-x-4">
            <Button variant="ghost">Login</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          {/* Rating Display */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2 text-lg">
            <div className="flex">
              {'★★★★★'.split('').map((star, i) => (
                <span key={i} className="text-yellow-400">
                  {star}
                </span>
              ))}
            </div>
            <span className="font-semibold">4.9</span>
            <span className="text-gray-600">500,000+ users</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold text-gray-900">웹서핑의 새로운 방법</h1>
          <p className="mb-12 text-xl text-gray-600">
            클릭 한 번으로 웹페이지를 메모하고, AI로 요약하고, 체계적으로 관리하세요
          </p>

          {/* Chrome Installation Button */}
          <div className="mb-8 flex justify-center">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-semibold text-gray-800 shadow-lg transition hover:shadow-xl">
              <img src="/chrome-icon.svg" alt="Chrome" className="h-6 w-6" />
              Install on Chrome
            </a>
          </div>

          {/* Mobile Apps */}
          <div className="flex justify-center gap-4">
            <a href="#" className="text-white hover:opacity-90">
              iOS App
            </a>
            <a href="#" className="text-white hover:opacity-90">
              Android App
            </a>
          </div>
        </div>

        {/* Feature Section */}
        <div className="mt-24 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">클릭 한 번의 웹 메모</h3>
            <p className="text-gray-600">
              웹서핑 중 떠오른 아이디어, 이제 놓치지 마세요. 어떤 페이지에서든 클릭 한 번으로 메모하세요
            </p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">한눈에 보는 메모</h3>
            <p className="text-gray-600">당신의 모든 웹 메모를 한눈에. 페이지별로 정리된 스마트한 메모 관리 시스템</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">체계적인 메모 정리</h3>
            <p className="text-gray-600">체계적인 정보 관리의 시작. 나만의 방식으로 메모를 분류하고 정리하세요.</p>
          </div>
        </div>

        {/* Additional Features */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">AI가 찾아주는 핵심 포인트</h3>
            <p className="text-gray-600">긴 콘텐츠는 AI가 요약하고, 당신은 핵심만 파악하세요.</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100">
              <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold">나중에 볼 콘텐츠 저장</h3>
            <p className="text-gray-600">관심 콘텐츠를 위시리스트에 담아두고 편할 때 확인하세요.</p>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="mt-24 text-center">
          <h2 className="mb-12 text-3xl font-bold">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Paste URL</h3>
              <p className="text-gray-600">Copy and paste any webpage URL into PageSummary</p>
            </div>
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold">AI Processing</h3>
              <p className="text-gray-600">Our AI analyzes and extracts key information</p>
            </div>
            <div>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Get Summary</h3>
              <p className="text-gray-600">Receive a concise, accurate summary instantly</p>
            </div>
          </div>
        </div>
      </main>

      {/* Q&A Section */}
      <div className="mx-auto mt-24 max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold">자주 묻는 질문</h2>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Web Memo는 어떤 서비스인가요?</AccordionTrigger>
            <AccordionContent>
              Web Memo는 웹 서핑 중 발견한 중요한 정보를 쉽게 저장하고 관리할 수 있는 서비스입니다. 클릭 한 번으로
              메모를 작성하고, AI를 통해 콘텐츠를 요약하며, 체계적으로 정보를 관리할 수 있습니다.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>무료로 이용할 수 있나요?</AccordionTrigger>
            <AccordionContent>
              네, Web Memo의 기본 기능은 무료로 제공됩니다. 메모 작성, 기본적인 정리 기능, 위시리스트 등을 무료로
              이용하실 수 있습니다.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>저장한 메모는 어디서 확인할 수 있나요?</AccordionTrigger>
            <AccordionContent>
              Chrome 확장 프로그램을 통해 언제든지 저장된 메모를 확인할 수 있습니다. 또한 웹사이트에서도 로그인 후 모든
              메모를 체계적으로 관리하고 확인할 수 있습니다.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>AI 요약 기능은 어떻게 작동하나요?</AccordionTrigger>
            <AccordionContent>
              AI 요약 기능은 웹 페이지의 내용을 자동으로 분석하여 핵심적인 내용만을 추출합니다. 긴 글도 몇 초 만에 핵심
              포인트를 파악할 수 있어 시간을 절약할 수 있습니다.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>다른 브라우저에서도 사용할 수 있나요?</AccordionTrigger>
            <AccordionContent>
              현재는 Chrome 브라우저를 지원하고 있으며, 다른 브라우저 지원도 계획 중에 있습니다. 정확한 출시 일정은 추후
              공지해 드리도록 하겠습니다.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer */}
      <footer className="mt-24 bg-gray-50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-semibold">PageSummary</h3>
              <p className="text-gray-600">Making content consumption easier and faster.</p>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Features</li>
                <li>Pricing</li>
                <li>Use Cases</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-lg font-semibold">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Contact</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-gray-200 pt-8 text-center text-gray-600">
            <p>&copy; 2024 PageSummary. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
