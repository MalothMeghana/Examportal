import React, { useState } from "react";
import { X, Copy, CheckCircle2 } from "lucide-react";

export default function CredentialsModal({ credentials, onClose, organizationName }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Ensure credentials is an array
  const credentialsList = Array.isArray(credentials) ? credentials : [];

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyAllCredentials = () => {
    const allCreds = credentialsList
      .map(cred => {
        const fullName = cred.full_name || cred.fullName || 'N/A';
        return `${cred.role.toUpperCase()}: ${fullName} - ${cred.email} / ${cred.password}`;
      })
      .join('\n');
    
    const fullText = `Organization: ${organizationName}\n\nUser Credentials (${credentialsList.length} users):\n${allCreds}\n\nEmails have been sent to all users with their login details.`;
    
    navigator.clipboard.writeText(fullText);
    setCopiedIndex('all');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[999] p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={28} />
                <h2 className="text-2xl font-bold">Organization Created Successfully!</h2>
              </div>
              <p className="text-green-50">Organization: {organizationName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
              ⚠️ <strong>Important:</strong> Save these credentials now! Passwords cannot be recovered later.
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📧 Login credentials have been automatically sent to all user email addresses.
            </p>
          </div>

          {/* Credentials List */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                User Credentials ({credentialsList.length})
              </h3>
              <button
                onClick={copyAllCredentials}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
              >
                {copiedIndex === 'all' ? (
                  <>
                    <CheckCircle2 size={16} />
                    Copied All!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy All
                  </>
                )}
              </button>
            </div>

            {credentialsList.length === 0 ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                <p className="text-yellow-800 dark:text-yellow-200">
                  No credentials received from server. Please check the console for errors.
                </p>
              </div>
            ) : (
              credentialsList.map((cred, index) => {
                const fullName = cred.full_name || cred.fullName || 'Not provided';
                return (
                  <div
                    key={index}
                    className="bg-gray-50 dark:bg-[#242424] rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs font-semibold uppercase">
                          {cred.role}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                            Contact Person
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => copyToClipboard(`Name: ${fullName}\nEmail: ${cred.email}\nPassword: ${cred.password}`, index)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                        title="Copy credentials"
                      >
                        {copiedIndex === index ? (
                          <CheckCircle2 size={18} className="text-green-600" />
                        ) : (
                          <Copy size={18} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Full Name</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-white dark:bg-[#1a1a1a] px-3 py-2 rounded-lg text-sm font-mono border border-gray-300 dark:border-gray-600">
                            {fullName}
                          </code>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Email</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-white dark:bg-[#1a1a1a] px-3 py-2 rounded-lg text-sm font-mono border border-gray-300 dark:border-gray-600">
                            {cred.email}
                          </code>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 font-medium">Password</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-white dark:bg-[#1a1a1a] px-3 py-2 rounded-lg text-sm font-mono border border-gray-300 dark:border-gray-600">
                            {cred.password}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={copyAllCredentials}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              <Copy size={18} />
              Copy All Credentials
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
