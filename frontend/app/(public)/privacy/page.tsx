import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 py-16 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-white mb-8 border-b border-slate-800 pb-4">
          Privacy Policy
        </h1>
        
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">1. Introduction</h2>
          <p>
            Welcome to Sovereign-AMM. We are committed to protecting your personal information and your right to privacy.
            If you have any questions or concerns about this privacy notice or our practices with regard to your personal information,
            please contact us.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">2. Information We Collect</h2>
          <p>
            The personal information that we collect depends on the context of your interactions with us and the website,
            the choices you make, and the products and features you use. We may collect the following information:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>Contact information such as email addresses and phone numbers.</li>
            <li>Usage data and telemetry related to platform interactions.</li>
            <li>Information you provide when communicating with our team.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">3. How We Use Your Information</h2>
          <p>
            We use personal information collected via our website for a variety of business purposes described below:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-slate-400">
            <li>To provide, operate, and maintain our platform.</li>
            <li>To improve, personalize, and expand our platform features.</li>
            <li>To communicate with you, either directly or through one of our partners, including for customer service and updates.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">4. Data Security</h2>
          <p>
            We implement a variety of security measures to maintain the safety of your personal information when you enter,
            submit, or access your personal information. However, please also remember that we cannot guarantee that the
            internet itself is 100% secure.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">5. Contact Us</h2>
          <p>
            If you have questions or comments about this notice, you may email us at 
            <a href="mailto:@sovereign-amm.com" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 ml-1">
              @sovereign-amm.com
            </a>
          </p>
        </section>

        <div className="pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}
