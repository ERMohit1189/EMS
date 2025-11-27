import React, { useState } from 'react';
import { Smartphone, Award, MapPin, Phone, Mail, Menu, X } from 'lucide-react';

export default function TutoringService() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const tutors = [
    { name: 'Prof. Alice', subject: 'Mathematics', rate: '$40/hr', exp: '10+ years' },
    { name: 'Dr. Bob', subject: 'Physics', rate: '$45/hr', exp: '15+ years' },
    { name: 'Ms. Carol', subject: 'English', rate: '$35/hr', exp: '8+ years' }
  ];

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-20">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white py-32 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-bold mb-6">Expert 1-on-1 Tutoring</h1>
                <p className="text-xl mb-8">Personalized learning from certified tutors</p>
                <button className="bg-white text-green-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
                  Book a Session
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
              {[
                { icon: Award, title: 'Certified Tutors', desc: 'Expert qualified instructors' },
                { icon: MapPin, title: 'Flexible Sessions', desc: 'Online or in-person' },
                { icon: Smartphone, title: 'Easy Booking', desc: 'Schedule anytime' }
              ].map((f, i) => (
                <div key={i} className="text-center p-6 bg-green-50 rounded-lg">
                  <f.icon className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'tutors':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Our Tutors</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {tutors.map((tutor, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-green-400 to-teal-400 h-40"></div>
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-2">{tutor.name}</h3>
                    <p className="text-green-600 font-bold mb-2">{tutor.subject}</p>
                    <p className="text-gray-600 mb-4">{tutor.exp} experience</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold">{tutor.rate}</span>
                      <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                        Select
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'subjects':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Subjects We Teach</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Computer Science', 'Economics'].map((subject, i) => (
                <button key={i} className="bg-green-100 hover:bg-green-600 hover:text-white text-green-600 p-6 rounded-lg font-bold text-lg transition">
                  {subject}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'packages':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12 text-center">Tutoring Packages</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', sessions: '4 sessions/month', price: '$160', benefits: ['Online sessions', 'Study materials'] },
                { name: 'Professional', sessions: '8 sessions/month', price: '$280', benefits: ['Online & in-person', 'Study materials', 'Progress reports'] },
                { name: 'Premium', sessions: 'Unlimited', price: 'Custom', benefits: ['Dedicated tutor', 'Custom schedule', 'Guarantee'] }
              ].map((pkg, i) => (
                <div key={i} className={`p-8 rounded-lg ${i === 1 ? 'bg-green-600 text-white shadow-xl' : 'bg-gray-50'}`}>
                  <h3 className="text-2xl font-bold mb-2">{pkg.name}</h3>
                  <div className="text-3xl font-bold mb-2">{pkg.price}</div>
                  <p className="mb-6">{pkg.sessions}</p>
                  <ul className="space-y-3 mb-8">
                    {pkg.benefits.map((b, j) => <li key={j}>✓ {b}</li>)}
                  </ul>
                  <button className={`w-full py-2 rounded font-bold ${i === 1 ? 'bg-white text-green-600' : 'bg-green-600 text-white'}`}>
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
            <h2 className="text-4xl font-bold mb-12">Get in Touch</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <div className="flex items-center gap-4">
                <Phone className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-bold">Phone</p>
                  <p className="text-gray-600">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Mail className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-bold">Email</p>
                  <p className="text-gray-600">info@tutorservice.com</p>
                </div>
              </div>
            </div>
            <form className="space-y-6">
              <input type="text" className="w-full border rounded-lg p-3" placeholder="Your name" />
              <input type="email" className="w-full border rounded-lg p-3" placeholder="Your email" />
              <textarea className="w-full border rounded-lg p-3 h-32" placeholder="Your message"></textarea>
              <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold w-full hover:bg-green-700">
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
      <nav className="bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Award /> TutorConnect
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className={`${mobileOpen ? 'block' : 'hidden'} md:block absolute md:relative top-16 md:top-0 left-0 md:left-auto w-full md:w-auto bg-white md:bg-transparent`}>
            {['home', 'tutors', 'subjects', 'packages', 'contact'].map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMobileOpen(false); }}
                className={`block md:inline-block px-4 py-2 capitalize font-medium ${currentPage === page ? 'text-green-600' : 'text-gray-700 hover:text-green-600'}`}
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
          <p>&copy; 2024 TutorConnect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
