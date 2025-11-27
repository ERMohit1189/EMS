import React, { useState } from 'react';
import { BookOpen, Star, Users, Clock, ArrowRight, Menu, X } from 'lucide-react';

export default function OnlineCoursesWebsite() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const courses = [
    { id: 1, title: 'Web Development Masterclass', instructor: 'John Doe', price: '$99', rating: 4.8, students: 5200 },
    { id: 2, title: 'Data Science Fundamentals', instructor: 'Sarah Smith', price: '$129', rating: 4.9, students: 3400 },
    { id: 3, title: 'UI/UX Design Bootcamp', instructor: 'Mike Johnson', price: '$89', rating: 4.7, students: 2800 }
  ];

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-20">
            {/* Hero */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-32 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-bold mb-6">Learn Anything, Anytime</h1>
                <p className="text-xl mb-8">Master new skills with courses from industry experts</p>
                <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
                  Explore Courses
                </button>
              </div>
            </div>

            {/* Features */}
            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
              {[
                { icon: BookOpen, title: '500+ Courses', desc: 'Learn from industry experts' },
                { icon: Users, title: '100K+ Students', desc: 'Join our global community' },
                { icon: Clock, title: 'Self-Paced', desc: 'Learn at your own speed' }
              ].map((f, i) => (
                <div key={i} className="text-center p-6 bg-gray-50 rounded-lg">
                  <f.icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'courses':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Popular Courses</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-40"></div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{course.title}</h3>
                    <p className="text-gray-600 mb-4">by {course.instructor}</p>
                    <div className="flex items-center mb-4">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-2 font-bold">{course.rating}</span>
                      <span className="text-gray-600 ml-2">({course.students.toLocaleString()})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">{course.price}</span>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Enroll</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'instructors':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Meet Our Instructors</h2>
            <div className="grid md:grid-cols-4 gap-8">
              {['John Doe', 'Sarah Smith', 'Mike Johnson', 'Emily Brown'].map((name, i) => (
                <div key={i} className="text-center">
                  <div className="w-40 h-40 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mx-auto mb-4"></div>
                  <h3 className="text-xl font-bold">{name}</h3>
                  <p className="text-gray-600">Expert Instructor</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'pricing':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12 text-center">Simple Pricing</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', price: '$9/mo', courses: '20+ courses', features: ['Lifetime access', 'Certificates'] },
                { name: 'Pro', price: '$29/mo', courses: 'All courses', features: ['Lifetime access', 'Certificates', '1:1 mentoring'] },
                { name: 'Enterprise', price: 'Custom', courses: 'Custom', features: ['Everything', 'Team licenses'] }
              ].map((plan, i) => (
                <div key={i} className={`p-8 rounded-lg ${i === 1 ? 'bg-blue-600 text-white shadow-xl' : 'bg-gray-50'}`}>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold mb-4">{plan.price}</div>
                  <p className="mb-6">{plan.courses}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => <li key={j}>✓ {f}</li>)}
                  </ul>
                  <button className={`w-full py-2 rounded font-bold ${i === 1 ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                    Get Started
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div className="max-w-2xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Contact Us</h2>
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">Name</label>
                <input type="text" className="w-full border rounded-lg p-3" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Email</label>
                <input type="email" className="w-full border rounded-lg p-3" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Message</label>
                <textarea className="w-full border rounded-lg p-3 h-32" placeholder="Your message"></textarea>
              </div>
              <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 w-full">
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
      {/* Navigation */}
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <BookOpen /> LearnHub
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className={`${mobileOpen ? 'block' : 'hidden'} md:block absolute md:relative top-16 md:top-0 left-0 md:left-auto w-full md:w-auto bg-white md:bg-transparent`}>
            {['home', 'courses', 'instructors', 'pricing', 'contact'].map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMobileOpen(false); }}
                className={`block md:inline-block px-4 py-2 capitalize font-medium ${currentPage === page ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 LearnHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
