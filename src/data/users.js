// Demo accounts. Any password works in the mock auth.
// `hourlyRate` (GBP/hour) is the standing rate for time recorded as hours or start/finish
// times. It is only ever a starting figure for the admin reviewing a shift, and is never
// shown to staff.
//
// There is deliberately NO standing day rate. What a full day is worth is decided by an admin
// at approval, per person and per occasion — see src/lib/wages.js.
export const USERS = [
  { id:'u1', name:'Alex Kaur',    email:'customer@demo.com', role:'customer', phone:'07700 900123' },
  { id:'u2', name:'Sam Patel',    email:'staff@demo.com',    role:'staff',    branch:'wol', jobTitle:'Senior technician', hourlyRate:16.5, branchManager:true },
  { id:'u3', name:'Central Admin',email:'admin@demo.com',    role:'admin', superAdmin:true },

  // Branch technicians. Names match TECHS in src/data/repairs.js so assigned repairs line up
  // with real staff records rather than free-text technician names.
  { id:'u4', name:'Priya Shah',   email:'priya@virktech.co.uk',  role:'staff', branch:'wol', jobTitle:'Technician',        hourlyRate:14.5, phone:'07700 900201' },
  { id:'u5', name:'Aman Singh',   email:'aman@virktech.co.uk',   role:'staff', branch:'sid', jobTitle:'Senior technician', hourlyRate:16,   phone:'07700 900202', branchManager:true },
  { id:'u6', name:'Jason Clarke', email:'jason@virktech.co.uk',  role:'staff', branch:'blv', jobTitle:'Technician',        hourlyRate:14,   phone:'07700 900203', branchManager:true },
  { id:'u7', name:'Leah Morgan',  email:'leah@virktech.co.uk',   role:'staff', branch:'nel', jobTitle:'Technician',        hourlyRate:14,   phone:'07700 900204', branchManager:true },
  { id:'u8', name:'Ravi Chauhan', email:'ravi@virktech.co.uk',   role:'staff', branch:'orp', jobTitle:'Technician',        hourlyRate:13.5, phone:'07700 900205', branchManager:true },
  { id:'u9', name:'Nadia Hassan', email:'nadia@virktech.co.uk',  role:'staff', branch:'wbs', jobTitle:'Sales assistant',   hourlyRate:12.5, phone:'07700 900206', branchManager:true },
  { id:'u10',name:'Dan Whitfield',email:'dan@virktech.co.uk',    role:'staff', branch:'whr', jobTitle:'Technician',        hourlyRate:13.5, phone:'07700 900207', branchManager:true },
  { id:'u11',name:'Ellie Brooks', email:'ellie@virktech.co.uk',  role:'staff', branch:'nsa', jobTitle:'Sales assistant',   hourlyRate:12.5, phone:'07700 900208', branchManager:true },
  { id:'u12',name:'Marcus Reid',  email:'marcus@virktech.co.uk', role:'staff', branch:'blv', jobTitle:'Sales assistant',   hourlyRate:12,   phone:'07700 900209' },
]

// Applied when a staff record predates the wage feature and has no hourly rate set.
export const DEFAULT_HOURLY_RATE = 12
