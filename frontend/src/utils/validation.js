const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateApplication({ name, email, resume }) {
  const e = {}
  if (name.trim().length < 2) e.applicant_name = 'Please enter your full name (at least 2 characters).'
  if (!EMAIL.test(email.trim())) e.applicant_email = 'Please enter a valid email address.'
  if (resume.trim().length < 20) e.resume_text = 'Paste your resume text (at least 20 characters).'
  return e
}

export function validateJob({ title, track, skills }) {
  const e = {}
  if (title.trim().length < 2) e.title = 'Title must be at least 2 characters.'
  if (track.trim().length < 2) e.track = 'Track must be at least 2 characters.'
  if (skills.length < 1) e.required_skills = 'Add at least one required skill.'
  return e
}

export function validateLogin({ email, password }) {
  const e = {}
  if (!EMAIL.test(email.trim())) e.email = 'Enter a valid email address.'
  if (!password) e.password = 'Enter your password.'
  return e
}
