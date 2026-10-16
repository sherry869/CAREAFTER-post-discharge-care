// Demo / Fictional Patient Records for CareAfter Hackathon Presentation
// All records are completely fictional and intended for demonstration purposes only.

export const STATUS_CONFIG = {
  red: {
    key: 'red',
    label: 'Needs Care',
    pillClass: 'red',
    color: '#F43F5E',
    bg: '#FFF1F2',
    border: '#FECDD3',
    textColor: '#BE123C',
    dotColor: '#F43F5E',
    description: 'Acute or concerning symptoms reported — requires immediate clinical triage'
  },
  amber: {
    key: 'amber',
    label: 'Under Observation',
    pillClass: 'amber',
    color: '#F59E0B',
    bg: '#FFFBEB',
    border: '#FDE68A',
    textColor: '#B45309',
    dotColor: '#F59E0B',
    description: 'Mild to moderate symptoms or recent discharge — close daily observation needed'
  },
  blue: {
    key: 'blue',
    label: 'Follow-Up Due',
    pillClass: 'blue',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    textColor: '#1D4ED8',
    dotColor: '#2563EB',
    description: 'Routine recovery questionnaire, doctor call, or vitals submission scheduled'
  },
  green: {
    key: 'green',
    label: 'Stable',
    pillClass: 'green',
    color: '#10B981',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    textColor: '#047857',
    dotColor: '#10B981',
    description: 'Patient reports no concerning symptoms; recovery trajectory progressing as expected'
  }
};

export const STATUS_LIST = [
  STATUS_CONFIG.red,
  STATUS_CONFIG.amber,
  STATUS_CONFIG.blue,
  STATUS_CONFIG.green
];

export function getPatientStatus(patient) {
  if (!patient) return STATUS_CONFIG.green;
  if (patient.status && STATUS_CONFIG[patient.status]) {
    return STATUS_CONFIG[patient.status];
  }
  // Fallback compatibility with boolean flags
  if (patient.red || patient.is_flagged) {
    return STATUS_CONFIG.red;
  }
  return STATUS_CONFIG.green;
}

export const INITIAL_PATIENTS = [
  {
    id: 1,
    name: 'Meera Nair',
    age: 72,
    dept: 'Cardiology',
    dx: 'Heart failure',
    phone: '+91 98470 11223',
    day_post_discharge: 4,
    day: 4,
    status: 'red',
    red: true,
    is_flagged: true,
    meds: 'Furosemide, Carvedilol',
    medications: 'Furosemide, Carvedilol',
    hist: 'Hypertension, diabetes',
    medical_history: 'Hypertension, diabetes',
    risk: 'Age over 70, low sodium diet',
    risk_factors: 'Age over 70, low sodium diet',
    today: [
      { q: 'Is your breathing worse than yesterday?', a: 'Severe' },
      { q: 'Did you take your water tablet this morning?', a: 'No' },
      { q: 'Any swelling in your feet?', a: 'Yes' }
    ],
    history: [
      { d: 'Day 3', l: [['Weight up by 1 kg?', 'Yes'], ['Short of breath at rest?', 'Moderate']] },
      { d: 'Day 2', l: [['Took all medicines?', 'Yes'], ['Any chest pain?', 'No']] },
      { d: 'Day 1', l: [['How are you feeling?', 'Moderate']] }
    ],
    sug: [
      'Call the patient and the caregiver today',
      'Visit the doctor tomorrow morning',
      'Check blood pressure and weight'
    ]
  },
  {
    id: 2,
    name: 'Arjun Menon',
    age: 64,
    dept: 'Cardiology',
    dx: 'Heart failure',
    phone: '+91 94470 55120',
    day_post_discharge: 12,
    day: 12,
    status: 'green',
    red: false,
    is_flagged: false,
    meds: 'Sacubitril, Spironolactone',
    medications: 'Sacubitril, Spironolactone',
    hist: 'Previous MI',
    medical_history: 'Previous MI',
    risk: 'Smoker',
    risk_factors: 'Smoker',
    today: [
      { q: 'Any breathlessness when walking?', a: 'No' },
      { q: 'Did you take all medicines?', a: 'Yes' }
    ],
    history: [
      { d: 'Day 11', l: [['Swelling in feet?', 'No'], ['Slept well?', 'Yes']] },
      { d: 'Day 10', l: [['Weight change?', 'No']] }
    ],
    sug: ['Keep monitoring, reduce questions to every second day']
  },
  {
    id: 3,
    name: 'Fathima Beevi',
    age: 68,
    dept: 'Pulmonology',
    dx: 'COPD flare-up',
    phone: '+91 99950 20871',
    day_post_discharge: 6,
    day: 6,
    status: 'red',
    red: true,
    is_flagged: true,
    meds: 'Tiotropium, Prednisolone',
    medications: 'Tiotropium, Prednisolone',
    hist: 'Asthma',
    medical_history: 'Asthma',
    risk: 'Lives alone',
    risk_factors: 'Lives alone',
    today: [
      { q: 'Is your cough producing more phlegm?', a: 'Yes' },
      { q: 'Do you have fever?', a: 'Moderate' }
    ],
    history: [
      { d: 'Day 5', l: [['Using inhaler as advised?', 'Yes'], ['Wheezing?', 'Moderate']] }
    ],
    sug: [
      'Ask about oxygen saturation if a meter is available',
      'Visit the doctor within 24 hours'
    ]
  },
  {
    id: 4,
    name: 'Thomas Varghese',
    age: 58,
    dept: 'Orthopedics',
    dx: 'Hip replacement',
    phone: '+91 98950 33410',
    day_post_discharge: 9,
    day: 9,
    status: 'amber',
    red: false,
    is_flagged: true,
    meds: 'Aspirin, Paracetamol',
    medications: 'Aspirin, Paracetamol',
    hist: 'None',
    medical_history: 'None',
    risk: 'Reduced mobility',
    risk_factors: 'Reduced mobility',
    today: [
      { q: 'Pain level today?', a: 'Moderate' },
      { q: 'Any redness at the wound?', a: 'No' }
    ],
    history: [
      { d: 'Day 8', l: [['Walked with support?', 'Yes'], ['Wound dry?', 'Yes']] }
    ],
    sug: ['Continue physiotherapy plan']
  },
  {
    id: 5,
    name: 'Lakshmi Pillai',
    age: 79,
    dept: 'Neurology',
    dx: 'Ischemic stroke',
    phone: '+91 94960 70012',
    day_post_discharge: 15,
    day: 15,
    status: 'blue',
    red: false,
    is_flagged: true,
    meds: 'Clopidogrel, Atorvastatin',
    medications: 'Clopidogrel, Atorvastatin',
    hist: 'Atrial fibrillation',
    medical_history: 'Atrial fibrillation',
    risk: 'Age over 75',
    risk_factors: 'Age over 75',
    today: [
      { q: 'Any new weakness or numbness?', a: 'No' },
      { q: 'Speech clear today?', a: 'Yes' }
    ],
    history: [
      { d: 'Day 14', l: [['Headache?', 'No'], ['Took blood thinner?', 'Yes']] }
    ],
    sug: ['Check blood pressure this week']
  },
  {
    id: 6,
    name: 'Rahul Krishnan',
    age: 49,
    dept: 'Orthopedics',
    dx: 'Knee ligament repair',
    phone: '+91 98460 81905',
    day_post_discharge: 3,
    day: 3,
    status: 'amber',
    red: false,
    is_flagged: true,
    meds: 'Ibuprofen',
    medications: 'Ibuprofen',
    hist: 'None',
    medical_history: 'None',
    risk: 'None',
    risk_factors: 'None',
    today: [
      { q: 'Pain level today?', a: 'Moderate' },
      { q: 'Able to bend the knee?', a: 'Yes' }
    ],
    history: [
      { d: 'Day 2', l: [['Swelling?', 'Moderate']] }
    ],
    sug: ['Continue ice and elevation']
  },
  {
    id: 7,
    name: 'Sara Joseph',
    age: 61,
    dept: 'Pulmonology',
    dx: 'Pneumonia',
    phone: '+91 99470 66384',
    day_post_discharge: 8,
    day: 8,
    status: 'green',
    red: false,
    is_flagged: false,
    meds: 'Amoxicillin',
    medications: 'Amoxicillin',
    hist: 'Diabetes',
    medical_history: 'Diabetes',
    risk: 'None',
    risk_factors: 'None',
    today: [
      { q: 'Is fever gone?', a: 'Yes' },
      { q: 'Cough better than yesterday?', a: 'Yes' }
    ],
    history: [
      { d: 'Day 7', l: [['Fever?', 'Moderate']] }
    ],
    sug: ['Complete antibiotic course']
  },
  {
    id: 8,
    name: 'George Paul',
    age: 70,
    dept: 'Cardiology',
    dx: 'Atrial fibrillation',
    phone: '+91 94000 41276',
    day_post_discharge: 21,
    day: 21,
    status: 'blue',
    red: false,
    is_flagged: true,
    meds: 'Apixaban, Metoprolol',
    medications: 'Apixaban, Metoprolol',
    hist: 'Hypertension',
    medical_history: 'Hypertension',
    risk: 'Missed doses before',
    risk_factors: 'Missed doses before',
    today: [
      { q: 'Any palpitations today?', a: 'No' }
    ],
    history: [
      { d: 'Day 20', l: [['Dizziness?', 'No']] }
    ],
    sug: ['Taper to weekly check-ins']
  }
];

export const DEPARTMENTS = ['Cardiology', 'Pulmonology', 'Orthopedics', 'Neurology'];
