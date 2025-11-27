import React, { useState } from 'react';
import { Zap, Trophy, FileText, TrendingUp, CheckCircle, Menu, X } from 'lucide-react';

export default function ExamPrepPlatform() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const exams = [
    { name: 'SAT', students: '5000+', accuracy: '94%', tests: '50+' },
    { name: 'ACT', students: '3000+', accuracy: '92%', tests: '40+' },
    { name: 'GRE', students: '2000+', accuracy: '95%', tests: '35+' },
    { name: 'GMAT', students: '1500+', accuracy: '96%', tests: '30+' }
  ];

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-20">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-32 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-bold mb-6">Master Your Exams</h1>
                <p className="text-xl mb-8">Comprehensive test prep with AI-powered learning</p>
                <button className="bg-white text-indigo-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
                  Start Free Trial
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
              {[
                { icon: FileText, title: '1000+ Tests', desc: 'Full-length practice exams' },
                { icon: TrendingUp, title: 'Score Tracking', desc: 'Real-time progress analytics' },
                { icon: Trophy, title: 'Expert Content', desc: 'Created by top educators' }
              ].map((f, i) => (
                <div key={i} className="text-center p-6 bg-indigo-50 rounded-lg">
                  <f.icon className="w-12 h-12 mx-auto mb-4 text-indigo-600" />
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'exams':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Exam Prep Courses</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {exams.map((exam, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition border-t-4 border-indigo-600">
                  <h3 className="text-3xl font-bold mb-6 text-indigo-600">{exam.name}</h3>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Students</p>
                      <p className="text-xl font-bold text-indigo-600">{exam.students}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Accuracy</p>
                      <p className="text-xl font-bold text-indigo-600">{exam.accuracy}</p>
                    </div>
                    <div className="bg-indigo-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Tests</p>
                      <p className="text-xl font-bold text-indigo-600">{exam.tests}</p>
                    </div>
                  </div>
                  <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 w-full">
                    Start Course
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'resources':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Study Resources</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Study Guides', items: '50+', icon: '📚' },
                { title: 'Video Lessons', items: '200+', icon: '🎥' },
                { title: 'Practice Questions', items: '5000+', icon: '❓' },
                { title: 'Flashcards', items: '1000+', icon: '🔖' },
                { title: 'Strategy Tips', items: '100+', icon: '💡' },
                { title: 'Performance Reports', items: 'Unlimited', icon: '📊' }
              ].map((resource, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg p-8 text-center hover:shadow-xl transition">
                  <div className="text-4xl mb-4">{resource.icon}</div>
                  <h3 className="text-2xl font-bold mb-2">{resource.title}</h3>
                  <p className="text-indigo-600 font-bold">{resource.items}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'results':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12 text-center">Success Stories</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Alex M.', score: '1560 SAT', improvement: '+280 points' },
                { name: 'Sarah J.', score: '35 ACT', improvement: '+8 points' },
                { name: 'Mike T.', score: '170 GRE', improvement: '+45 points' }
              ].map((result, i) => (
                <div key={i} className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-lg text-center">
                  <CheckCircle className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">{result.name}</h3>
                  <p className="text-3xl font-bold text-indigo-600 mb-2">{result.score}</p>
                  <p className="text-green-600 font-bold">{result.improvement}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'pricing':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12 text-center">Subscription Plans</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', price: '$19/mo', features: ['1 exam course', '50 practice tests', 'Basic analytics'] },
                { name: 'Pro', price: '$49/mo', features: ['All exam courses', '1000+ tests', 'Advanced analytics', 'Personal tutor'] },
                { name: 'Elite', price: '$99/mo', features: ['Everything', '1:1 coaching', 'Priority support'] }
              ].map((plan, i) => (
                <div key={i} className={`p-8 rounded-lg ${i === 1 ? 'bg-indigo-600 text-white shadow-xl' : 'bg-gray-50'}`}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-6">{plan.price}</div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => <li key={j}>✓ {f}</li>)}
                  </ul>
                  <button className={`w-full py-2 rounded font-bold ${i === 1 ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                    Choose Plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div className="max-w-2xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Get In Touch</h2>
            <form className="space-y-6">
              <input type="text" className="w-full border rounded-lg p-3" placeholder="Your name" />
              <input type="email" className="w-full border rounded-lg p-3" placeholder="Your email" />
              <select className="w-full border rounded-lg p-3">
                <option>Select exam...</option>
                <option>SAT</option>
                <option>ACT</option>
                <option>GRE</option>
                <option>GMAT</option>
              </select>
              <textarea className="w-full border rounded-lg p-3 h-32" placeholder="Your message"></textarea>
              <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-bold w-full hover:bg-indigo-700">
                Send Message
              </button>
            </form>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <Zap /> PrepMaster
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className={`${mobileOpen ? 'block' : 'hidden'} md:block absolute md:relative top-16 md:top-0 left-0 md:left-auto w-full md:w-auto bg-white md:bg-transparent`}>
            {['home', 'exams', 'resources', 'results', 'pricing', 'contact'].map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMobileOpen(false); }}
                className={`block md:inline-block px-4 py-2 capitalize font-medium ${currentPage === page ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main>
        {renderPage()}
      </main>

      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 PrepMaster. Master Your Exams.</p>
        </div>
      </footer>
    </div>
  );
}
