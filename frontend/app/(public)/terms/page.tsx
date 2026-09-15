import React from "react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white mb-8 border-b border-slate-800 pb-4">
          Terms of Service
        </h1>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Agreement to Terms</h2>
          <p>
            By accessing or using Sovereign-AMM, you agree to be bound by these Terms of Service.
            If you do not agree with all of these terms, you are prohibited from using the site and our services
            and must discontinue use immediately.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Intellectual Property Rights</h2>
          <p>
            Unless otherwise indicated, the website and its source code, databases, functionality, software, website designs,
            audio, video, text, photographs, and graphics are our proprietary property and are protected by applicable intellectual
            property laws and treaties.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. User Representations</h2>
          <p>
            By using the website, you represent and warrant that:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>All information you submit will be true, accurate, current, and complete.</li>
            <li>You will maintain the accuracy of such information and promptly update it as necessary.</li>
            <li>You have the legal capacity and agree to comply with these Terms of Service.</li>
            <li>You will not access the website through automated or non-human means, unless authorized.</li>
            <li>You will not use the website for any illegal or unauthorized purpose.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Modifications and Interruptions</h2>
          <p>
            We reserve the right to change, modify, or remove the contents of the website at any time or for any reason
            at our sole discretion without notice. However, we have no obligation to update any information on our website.
            We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the website.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Contact Information</h2>
          <p>
            In order to resolve a complaint regarding the site or to receive further information regarding use of the site, please contact us at:
            <br />
            Email: <a href="mailto:@sovereign-amm.com" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300">@sovereign-amm.com</a>
            <br />
            Phone: +91 99074 18830
          </p>
        </section>

        <div className="pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
