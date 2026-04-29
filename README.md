# thizCoffee-next - Next.js 14

A modern, responsive portfolio website built with Next.js 14, featuring cutting-edge technologies and exceptional UI/UX design.

## ✨ Features

- **Next.js 14** with App Router and Server Components
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for smooth animations
- **Dark/Light mode** with system preference detection
- **Responsive design** optimized for all devices
- **SEO optimized** with structured data
- **Performance optimized** with lazy loading and image optimization

## 🚀 Sections

- **Interactive Hero Section** - Animated gradient background with smooth animations
- **About Section** - Professional bio with skills visualization
- **Projects Showcase** - Filterable portfolio with detailed case study modals
- **Skills Section** - Interactive skills cloud with proficiency indicators
- **Testimonials** - Client testimonials carousel
- **Contact Form** - Validated contact form with toast notifications

## 🛠️ Technologies

- Next.js 14
- TypeScript
- Tailwind CSS
- Framer Motion
- React Hook Form
- Zod (validation)
- shadcn/ui components
- Lucide React icons

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd portfolio
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Customization

### Personal Information
Update the following files with your information:
- `lib/data.ts` - Projects, skills, and testimonials data
- `app/layout.tsx` - SEO metadata and JSON-LD structured data
- `components/sections/hero-section.tsx` - Hero content
- `components/sections/about-section.tsx` - About content

### Styling
- `app/globals.css` - Global styles and CSS variables
- `tailwind.config.ts` - Tailwind configuration
- Individual component files for section-specific styles

### Content Images
Replace placeholder images with your actual project images:
- Update image URLs in `lib/data.ts`
- Ensure images are optimized for web (WebP format recommended)
- Use appropriate alt text for accessibility

## 📱 Responsive Design

The portfolio is built with a mobile-first approach:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px  
- **Desktop**: > 1024px

## 🎨 Design System

### Colors
- **Primary**: Indigo (#6366F1)
- **Secondary**: Emerald (#10B981)
- **Accent**: Orange (#F59E0B)
- **Success/Warning/Error**: Comprehensive color palette

### Typography
- **Font**: Inter (Google Fonts)
- **Scale**: Consistent typography scale
- **Line Height**: 150% for body, 120% for headings

### Spacing
- **System**: 8px base unit
- **Components**: Consistent spacing throughout

## 🚀 Deployment

### Netlify (Recommended)
1. Build the project:
```bash
npm run build
```

2. Deploy the `out` folder to Netlify

### Vercel
1. Connect your GitHub repository to Vercel
2. Deploy automatically on push

### Other Providers
The project generates static files and can be deployed to any static hosting provider.

## 📊 Performance

The portfolio is optimized for:
- **90+ Lighthouse scores** across all metrics
- **Image optimization** with Next.js Image component
- **Code splitting** and lazy loading
- **SEO optimization** with metadata and structured data

## 🔒 SEO Features

- Semantic HTML structure
- Open Graph metadata
- Twitter Card support  
- JSON-LD structured data
- Sitemap generation
- Robots.txt

## 🎯 Best Practices

- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Lazy loading, image optimization, code splitting
- **SEO**: Structured data, metadata, semantic HTML
- **Security**: Safe external links, form validation
- **Code Quality**: TypeScript, ESLint, consistent formatting

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](issues).

## 👨‍💻 Author

**Your Name**
- Website: [luluuu.vercel.app](https://luluuu.vercel.app)
- GitHub: [@kholilullahhhh](https://github.com/Kholilullahhhh)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/muhammad-kholilullah-8b7832276)

---

⭐️ If you like this project, please give it a star on GitHub!
