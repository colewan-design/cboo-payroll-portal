export type BotRule = {
  patterns: RegExp[];
  response: string;
  suggestions?: string[];
};

const RULES: BotRule[] = [
  // ── Greetings ──────────────────────────────────────────────────────────────
  {
    patterns: [/\b(hi|hello|hey|good (morning|afternoon|evening)|greetings|howdy)\b/i],
    response:
      "Hello! 👋 I'm your BSU CBOO Payroll Assistant. How can I help you today?",
    suggestions: [
      'How do I view my payslips?',
      'How do I download a payslip?',
      'How do I change my password?',
      'What can you help with?',
    ],
  },

  // ── Help / capabilities ────────────────────────────────────────────────────
  {
    patterns: [/\b(help|what can you|what do you|capabilities|features|commands)\b/i],
    response:
      'I can help you with the following topics:\n\n• 📄 Viewing & downloading payslips\n• 💰 Salary & deduction info\n• 📢 News & updates\n• 🔑 Changing your password\n• 👤 Profile & account info\n\nJust ask me anything!',
    suggestions: [
      'How do I view my payslips?',
      'What are my deductions?',
      'How do I change my password?',
    ],
  },

  // ── View payslips ─────────────────────────────────────────────────────────
  {
    patterns: [/\b(view|see|check|open|find|where.*payslip|payslip.*where)\b/i],
    response:
      'To view your payslips:\n\n1. Tap the **Payslips** tab at the bottom of the screen.\n2. Use the filters at the top to select a year or payslip type.\n3. Tap any payslip row to open the full salary breakdown.',
    suggestions: ['How do I download a payslip?', 'What does my payslip show?'],
  },

  // ── Download payslip ──────────────────────────────────────────────────────
  {
    patterns: [/\b(download|save|export|pdf|print)\b/i],
    response:
      'To download a payslip as PDF:\n\n1. Go to the **Payslips** tab.\n2. Tap the payslip you want.\n3. In the detail view, tap the **Download** button at the bottom.\n\nThe file will be saved to your device\'s Downloads folder.',
    suggestions: ['What does my payslip show?', 'How do I view my payslips?'],
  },

  // ── Payslip breakdown / what does it show ────────────────────────────────
  {
    patterns: [
      /\b(payslip|payroll|pay slip)\b/i,
      /\bwhat.*show|breakdown|contains\b/i,
    ],
    response:
      'Your payslip includes:\n\n• **Basic Pay** — your monthly rate\n• **PERA / allowances** — government allowances\n• **Gross Pay** — total earnings\n• **Deductions** — GSIS, PhilHealth, Pag-IBIG, withholding tax\n• **Net Pay** — your take-home amount',
    suggestions: ['How do I download a payslip?', 'What are my deductions?'],
  },

  // ── Salary / monthly rate ─────────────────────────────────────────────────
  {
    patterns: [/\b(salary|monthly rate|pay rate|how much|wage|income|compensation)\b/i],
    response:
      'Your salary details are shown on the **Dashboard** — look for the stats card showing your Salary Grade, Step, and Monthly Rate.\n\nFor a full breakdown per period, open any payslip from the Payslips tab.',
    suggestions: ['How do I view my payslips?', 'What are my deductions?'],
  },

  // ── Deductions ────────────────────────────────────────────────────────────
  {
    patterns: [/\b(deduction|deductions|gsis|philhealth|pagibig|pag-ibig|tax|withholding)\b/i],
    response:
      'Common deductions on your payslip:\n\n• **GSIS** — Government Service Insurance System premium\n• **PhilHealth** — health insurance contribution\n• **Pag-IBIG** — home development mutual fund\n• **Withholding Tax** — income tax withheld by employer\n\nThe exact amounts appear in your payslip breakdown.',
    suggestions: ['How do I view my payslips?', 'How do I download a payslip?'],
  },

  // ── Announcements ─────────────────────────────────────────────────────────
  {
    patterns: [/\b(announcement|announcements|news|update|memo|notice|bulletin)\b/i],
    response:
      'To read news:\n\n1. Tap the **News** tab at the bottom.\n2. Scroll to browse all posts.\n3. Tap any post to read the full content.\n\nPinned posts appear at the top and are marked with a 📌 pin badge.',
    suggestions: ['How do I get notified about new news posts?'],
  },

  // ── Push notifications ────────────────────────────────────────────────────
  {
    patterns: [/\b(notif|notification|push|alert|remind)\b/i],
    response:
      'The app sends **push notifications** whenever a new news post is published. Make sure notifications are enabled for this app in your device\'s Settings to stay updated.',
    suggestions: ['How do I view news?'],
  },

  // ── Change password ───────────────────────────────────────────────────────
  {
    patterns: [/\b(change.*password|update.*password|reset.*password|password.*change|new password|forgot password)\b/i],
    response:
      'To change your password:\n\n1. Go to the **Profile** tab.\n2. Tap **Change Password**.\n3. Enter your current password, then your new password twice.\n4. Tap **Update Password**.\n\n⚠️ Make sure your new password is at least 8 characters.',
    suggestions: ['How do I access my profile?'],
  },

  // ── Profile / account ─────────────────────────────────────────────────────
  {
    patterns: [/\b(profile|account|my info|personal info|employee info|employee id)\b/i],
    response:
      'Your profile is available in the **Profile** tab. It shows:\n\n• Full name & employee ID\n• Email address\n• Assigned roles\n• Option to change your password\n• Sign out button',
    suggestions: ['How do I change my password?', 'How do I sign out?'],
  },

  // ── Sign out / logout ─────────────────────────────────────────────────────
  {
    patterns: [/\b(sign out|logout|log out|signout)\b/i],
    response:
      'To sign out:\n\n1. Go to the **Profile** tab.\n2. Scroll down and tap **Sign Out**.\n3. Confirm when prompted.\n\nYour session will be securely cleared from this device.',
    suggestions: ['How do I sign back in?'],
  },

  // ── Sign in / login ───────────────────────────────────────────────────────
  {
    patterns: [/\b(sign in|login|log in|signin|credentials|access)\b/i],
    response:
      'To sign in, enter your BSU email address (e.g., you@bsu.edu.ph) and your assigned password on the login screen.\n\nIf you\'re having trouble logging in, contact your HR or payroll administrator.',
    suggestions: ['How do I change my password?'],
  },

  // ── Contact / support ─────────────────────────────────────────────────────
  {
    patterns: [/\b(contact|support|admin|administrator|hr|human resource|help desk|helpdesk)\b/i],
    response:
      'For account issues, payroll corrections, or system problems, please contact your **HR or Payroll Administrator** at the CBOO (Chief Business Operations Officer) office of Benguet State University.',
    suggestions: ['How do I change my password?', 'What can you help with?'],
  },

  // ── Error / problem ───────────────────────────────────────────────────────
  {
    patterns: [/\b(error|problem|issue|bug|not working|cannot|can't|unable|failed)\b/i],
    response:
      'Sorry to hear you\'re having trouble! Here are some things to try:\n\n1. **Check your internet connection** — make sure you\'re on the same network as the payroll server.\n2. **Pull down to refresh** on any screen.\n3. **Sign out and sign back in** to refresh your session.\n\nIf the issue persists, contact your payroll administrator.',
    suggestions: ['How do I sign out?', 'How do I contact support?'],
  },

  // ── Thank you ─────────────────────────────────────────────────────────────
  {
    patterns: [/\b(thank|thanks|thank you|ty|salamat)\b/i],
    response: "You're welcome! 😊 Is there anything else I can help you with?",
    suggestions: ['What can you help with?'],
  },

  // ── Goodbye ───────────────────────────────────────────────────────────────
  {
    patterns: [/\b(bye|goodbye|see you|good night|take care)\b/i],
    response: 'Goodbye! Have a great day. 👋 Feel free to come back anytime you have questions.',
    suggestions: [],
  },
];

const FALLBACK: BotRule = {
  patterns: [],
  response:
    "I'm sorry, I didn't quite understand that. Could you rephrase? You can also try one of the suggestions below.",
  suggestions: [
    'How do I view my payslips?',
    'How do I change my password?',
    'What can you help with?',
  ],
};

export function getBotReply(input: string): { response: string; suggestions: string[] } {
  const text = input.trim().toLowerCase();

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return {
        response: rule.response,
        suggestions: rule.suggestions ?? [],
      };
    }
  }

  return {
    response: FALLBACK.response,
    suggestions: FALLBACK.suggestions ?? [],
  };
}
