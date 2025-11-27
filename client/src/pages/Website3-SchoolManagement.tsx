import React, { useState } from 'react';
import { GraduationCap, Calendar, Users, BookMarked, Bell, Menu, X } from 'lucide-react';

export default function SchoolManagement() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const events = [
    { date: 'Jan 15', title: 'Annual Sports Day', location: 'School Grounds' },
    { date: 'Jan 22', title: 'Science Exhibition', location: 'School Auditorium' },
    { date: 'Feb 05', title: 'Parent-Teacher Meeting', location: 'Classrooms' }
  ];

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-20">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-32 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-bold mb-6">Welcome to Elite Academy</h1>
                <p className="text-xl mb-8">Excellence in Education & Character Development</p>
                <button className="bg-white text-orange-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
                  Admissions Open
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-3 gap-8">
              {[
                { icon: GraduationCap, title: '95% Pass Rate', desc: 'Excellent academic results' },
                { icon: Users, title: '2000+ Students', desc: 'Strong community' },
                { icon: BookMarked, title: 'State-of-Art', desc: 'Modern infrastructure' }
              ].map((f, i) => (
                <div key={i} className="text-center p-6 bg-orange-50 rounded-lg">
                  <f.icon className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                  <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'academics':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Academic Programs</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { level: 'Primary (I-V)', curriculum: 'CBSE', students: '400+' },
                { level: 'Secondary (VI-VIII)', curriculum: 'CBSE', students: '500+' },
                { level: 'Senior (IX-XII)', curriculum: 'CBSE', students: '600+' }
              ].map((prog, i) => (
                <div key={i} className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
                  <h3 className="text-2xl font-bold mb-4 text-orange-600">{prog.level}</h3>
                  <p className="mb-2"><strong>Curriculum:</strong> {prog.curriculum}</p>
                  <p className="mb-6"><strong>Students:</strong> {prog.students}</p>
                  <button className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 w-full">
                    Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'admissions':
        return (
          <div className="max-w-4xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Admissions 2024</h2>
            <div className="bg-orange-50 p-8 rounded-lg mb-8">
              <h3 className="text-2xl font-bold mb-4">Application Requirements</h3>
              <ul className="space-y-3 mb-8">
                <li>✓ Birth Certificate</li>
                <li>✓ Vaccination Records</li>
                <li>✓ Previous School Records (if applicable)</li>
                <li>✓ Entrance Examination</li>
              </ul>
              <button className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700">
                Apply Now
              </button>
            </div>
          </div>
        );
      
      case 'events':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Upcoming Events</h2>
            <div className="space-y-6">
              {events.map((event, i) => (
                <div key={i} className="flex items-start gap-6 bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                  <div className="bg-orange-600 text-white p-4 rounded-lg min-w-fit">
                    <p className="font-bold text-lg">{event.date}</p>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{event.title}</h3>
                    <p className="text-gray-600 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> {event.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'contact':
        return (
          <div className="max-w-2xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Contact Information</h2>
            <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
              <div>
                <p className="font-bold mb-2">📍 Address</p>
                <p className="text-gray-600">123 Education Lane, City Center, State 12345</p>
              </div>
              <div>
                <p className="font-bold mb-2">📞 Phone</p>
                <p className="text-gray-600">+1 (555) 987-6543</p>
              </div>
              <div>
                <p className="font-bold mb-2">✉️ Email</p>
                <p className="text-gray-600">admissions@eliteacademy.edu</p>
              </div>
              <form className="space-y-4 mt-8 pt-8 border-t">
                <input type="text" className="w-full border rounded-lg p-3" placeholder="Your name" />
                <input type="email" className="w-full border rounded-lg p-3" placeholder="Your email" />
                <textarea className="w-full border rounded-lg p-3 h-32" placeholder="Your inquiry"></textarea>
                <button className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold w-full hover:bg-orange-700">
                  Send Inquiry
                </button>
              </form>
            </div>
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
          <div className="text-2xl font-bold text-orange-600 flex items-center gap-2">
            <GraduationCap /> Elite Academy
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className={`${mobileOpen ? 'block' : 'hidden'} md:block absolute md:relative top-16 md:top-0 left-0 md:left-auto w-full md:w-auto bg-white md:bg-transparent`}>
            {['home', 'academics', 'admissions', 'events', 'contact'].map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMobileOpen(false); }}
                className={`block md:inline-block px-4 py-2 capitalize font-medium ${currentPage === page ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'}`}
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
          <p>&copy; 2024 Elite Academy. Excellence in Education.</p>
        </div>
      </footer>
    </div>
  );
}
