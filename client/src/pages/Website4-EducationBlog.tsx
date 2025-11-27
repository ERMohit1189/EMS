import React, { useState } from 'react';
import { Newspaper, Clock, User, ArrowRight, Menu, X } from 'lucide-react';

export default function EducationBlog() {
  const [currentPage, setCurrentPage] = useState('home');
  const [mobileOpen, setMobileOpen] = useState(false);

  const articles = [
    { id: 1, title: '10 Tips for Effective Online Learning', category: 'Learning', date: 'Jan 15', author: 'Dr. Smith', excerpt: 'Discover proven strategies for maximizing your online education experience...' },
    { id: 2, title: 'The Future of Education Technology', category: 'Technology', date: 'Jan 12', author: 'Prof. Jones', excerpt: 'Exploring AI and machine learning in modern educational systems...' },
    { id: 3, title: 'Student Wellness: Balance Study and Health', category: 'Wellness', date: 'Jan 10', author: 'Ms. Brown', excerpt: 'Mental health tips for students during exam seasons...' }
  ];

  const renderPage = () => {
    switch(currentPage) {
      case 'home':
        return (
          <div className="space-y-20">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-32 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-5xl font-bold mb-6">EduInsights Blog</h1>
                <p className="text-xl mb-8">Your source for education, learning, and growth</p>
                <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100">
                  Read Latest
                </button>
              </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
              <h2 className="text-3xl font-bold mb-8">Featured Articles</h2>
              <div className="space-y-8">
                {articles.map((article, i) => (
                  <div key={i} className="bg-white border-l-4 border-purple-600 p-6 rounded-r-lg shadow-md hover:shadow-lg transition">
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full">{article.category}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {article.date}</span>
                      <span className="flex items-center gap-1"><User className="w-4 h-4" /> {article.author}</span>
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-gray-900">{article.title}</h3>
                    <p className="text-gray-600 mb-4">{article.excerpt}</p>
                    <button className="text-purple-600 font-bold flex items-center gap-2 hover:gap-3 transition">
                      Read More <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'articles':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">All Articles</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {articles.concat(articles).map((article, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                  <div className="bg-gradient-to-r from-purple-400 to-pink-400 h-32"></div>
                  <div className="p-6">
                    <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm">{article.category}</span>
                    <h3 className="text-xl font-bold my-3">{article.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{article.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{article.date}</span>
                      <button className="text-purple-600 font-bold hover:text-purple-700">Read →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'categories':
        return (
          <div className="max-w-6xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-12">Browse Categories</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {['Learning Strategies', 'Technology & AI', 'Student Wellness', 'Career Guidance', 'Test Prep', 'Parent Resources'].map((cat, i) => (
                <button key={i} className="bg-purple-100 hover:bg-purple-600 hover:text-white text-purple-600 p-8 rounded-lg font-bold text-lg transition">
                  {cat}
                </button>
              ))}
            </div>
          </div>
        );
      
      case 'about':
        return (
          <div className="max-w-4xl mx-auto px-4 py-20">
            <h2 className="text-4xl font-bold mb-8">About EduInsights</h2>
            <div className="space-y-6 text-gray-700 text-lg">
              <p>EduInsights is a leading educational blog dedicated to empowering students, educators, and parents with valuable insights and practical advice.</p>
              <p>Our mission is to make quality educational content accessible to everyone and help people achieve their learning goals.</p>
              <p>With contributions from leading educators and education experts, we cover topics ranging from study techniques to technology in education.</p>
              <div className="bg-purple-50 p-8 rounded-lg mt-8">
                <h3 className="text-2xl font-bold mb-4">Our Contributors</h3>
                <p>Meet our team of passionate educators and writers who share their expertise to help you succeed.</p>
              </div>
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
                <label className="block text-sm font-bold mb-2">Subject</label>
                <input type="text" className="w-full border rounded-lg p-3" placeholder="Subject" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Message</label>
                <textarea className="w-full border rounded-lg p-3 h-32" placeholder="Your message"></textarea>
              </div>
              <button className="bg-purple-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-purple-700 w-full">
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
          <div className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <Newspaper /> EduInsights
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden">
            {mobileOpen ? <X /> : <Menu />}
          </button>
          <div className={`${mobileOpen ? 'block' : 'hidden'} md:block absolute md:relative top-16 md:top-0 left-0 md:left-auto w-full md:w-auto bg-white md:bg-transparent`}>
            {['home', 'articles', 'categories', 'about', 'contact'].map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); setMobileOpen(false); }}
                className={`block md:inline-block px-4 py-2 capitalize font-medium ${currentPage === page ? 'text-purple-600' : 'text-gray-700 hover:text-purple-600'}`}
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
          <p>&copy; 2024 EduInsights Blog. Empowering Education.</p>
        </div>
      </footer>
    </div>
  );
}
