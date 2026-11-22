import { ExamDefinition } from '../types/exam';

export const NISM_EXAMS: ExamDefinition[] = [
  {
    id: 'nism-va',
    code: 'NISM-Series-V-A',
    name: 'NISM-Series-V-A: Mutual Fund Distributors Certification Examination',
    shortName: 'Mutual Fund Distributors (V-A)',
    description:
      'Covers the fundamentals of mutual funds, legal and regulatory framework, scheme disclosures, distribution practices, NAV & TER computation, taxation, investor services, and risk-return evaluation.',
    totalQuestionsFullMock: 100,
    totalMarksFullMock: 100,
    marksPerQuestion: 1,
    negativeMarking: 0,
    durationMinutes: 120,
    passingPercentage: 50,
    chapters: [
      {
        chapterNumber: 1,
        title: 'Investment Landscape',
        weightage: 6,
        summary: 'Financial goals, asset classes, inflation impact, risk-return trade-off, and asset allocation.',
        keyTopics: ['Financial vs Physical Assets', 'Inflation & Real Return', 'Asset Allocation', 'Investment Risks'],
      },
      {
        chapterNumber: 2,
        title: 'Concept and Role of a Mutual Fund',
        weightage: 8,
        summary: 'Pooling mechanism, mutual fund classification, open-ended vs close-ended, SEBI scheme categorization.',
        keyTopics: ['Advantages of Mutual Funds', 'Open vs Close-ended', 'SEBI Categorization', 'IDCW vs Growth'],
      },
      {
        chapterNumber: 3,
        title: 'Legal Structure of Mutual Funds in India',
        weightage: 6,
        summary: 'Three-tier structure: Sponsor, Trust/Trustee, Asset Management Company, and key constituents like Custodian and RTA.',
        keyTopics: ['Sponsor Eligibility', 'Board of Trustees', 'AMC Responsibilities', 'Custodian & RTA'],
      },
      {
        chapterNumber: 4,
        title: 'Legal and Regulatory Framework',
        weightage: 10,
        summary: 'SEBI (Mutual Funds) Regulations, AMFI Code of Ethics, investor rights, and advertisement guidelines.',
        keyTopics: ['SEBI Regulations', 'AMFI Code of Conduct', 'Due Diligence', 'Unclaimed Dividend & Redemption'],
      },
      {
        chapterNumber: 5,
        title: 'Scheme Related Information',
        weightage: 8,
        summary: 'SID, SAI, KIM, addendum, risk-o-meter, and mandatory statutory disclosures.',
        keyTopics: ['SID & SAI', 'Key Information Memorandum', 'Risk-o-meter', 'Scheme Disclosures'],
      },
      {
        chapterNumber: 6,
        title: 'Fund Distribution and Channel Management Practices',
        weightage: 10,
        summary: 'ARN registration, EUIN, commission structures, B30 incentives, and digital distribution channels.',
        keyTopics: ['ARN & KYD', 'EUIN Norms', 'Trail Commission', 'Direct vs Regular Plans'],
      },
      {
        chapterNumber: 7,
        title: 'Net Asset Value, Total Expense Ratio and Pricing of Units',
        weightage: 10,
        summary: 'NAV calculation, mark-to-market valuation, TER slabs, cut-off timings, and stamp duty.',
        keyTopics: ['NAV Formula', 'TER Limits', 'Cut-off Timings', 'Exit Load & Stamp Duty'],
      },
      {
        chapterNumber: 8,
        title: 'Taxation',
        weightage: 8,
        summary: 'Capital gains taxation, equity vs debt definitions, indexation rules, STT, TDS, and dividend taxation.',
        keyTopics: ['STCG & LTCG', 'Specified Mutual Funds', 'IDCW Taxation', 'STT & TDS'],
      },
      {
        chapterNumber: 9,
        title: 'Investor Services',
        weightage: 12,
        summary: 'KYC norms, PAN exemptions, SIP/STP/SWP, nomination, transmission, and demat vs SoA.',
        keyTopics: ['KYC & Aadhaar', 'SIP, STP & SWP', 'Nomination & Transmission', 'Pledge & Lien'],
      },
      {
        chapterNumber: 10,
        title: 'Risk, Return and Performance of Funds',
        weightage: 8,
        summary: 'CAGR, XIRR, standard deviation, beta, Sharpe ratio, Treynor ratio, and Macaulay duration.',
        keyTopics: ['CAGR & XIRR', 'Standard Deviation & Beta', 'Sharpe & Treynor', 'Modified Duration'],
      },
      {
        chapterNumber: 11,
        title: 'Mutual Fund Scheme Performance',
        weightage: 7,
        summary: 'TRI benchmarks, Alpha, Tracking Error, Information Ratio, and peer comparison.',
        keyTopics: ['Total Return Index (TRI)', 'Jensen Alpha', 'Tracking Error', 'Credit Quality & Yield'],
      },
      {
        chapterNumber: 12,
        title: 'Mutual Fund Scheme Selection',
        weightage: 7,
        summary: 'Matching schemes to investor profile, goal horizons, portfolio rebalancing, and model portfolios.',
        keyTopics: ['Risk Profiling', 'Time Horizon Mapping', 'Core & Satellite Portfolio', 'Rebalancing'],
      },
    ],
  },
];

export const NISM_VA_EXAM: ExamDefinition = NISM_EXAMS[0];
