const legalData = {
  name: "LEGAL_BOT Legal Knowledge Base",
  status: "prototype",
  purpose: "General legal awareness for Indian law, rights, duties, and procedures",
  legalDomains: [
    "Constitutional rights",
    "Police and arrest procedure",
    "Criminal law and offences",
    "Women safety and protection",
    "Consumer rights",
    "RTI and transparency",
    "Cyber law and online fraud",
    "Property and land disputes",
    "Legal remedies and complaint procedures"
  ],
  sources: [
    "Constitution of India",
    "Bharatiya Nyaya Sanhita, 2023",
    "Bharatiya Nagarik Suraksha Sanhita, 2023",
    "Bharatiya Sakshya Adhiniyam, 2023",
    "Consumer Protection Act, 2019",
    "Right to Information Act, 2005",
    "Information Technology Act, 2000"
  ],
  scopeRule: "Only answer Indian law, legal rights, duties, protections, and legal procedures. Refuse unrelated questions."
};

module.exports = legalData;