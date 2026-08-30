// Demo accounts. Any password works in the mock auth.
// Pay has two bases, and a shift uses whichever one matches how it was recorded:
//   `hourlyRate` (GBP/hour) pays shifts recorded as total hours or start/finish times;
//   `dailyRate`  (GBP/day)  pays a shift recorded as a full day: a flat amount, never
//                           converted into an hours figure.
// See src/lib/wages.js, which is the only place that decides which basis applies.
export const USERS = [
  { id:'u1', name:'Alex Kaur',    email:'customer@demo.com', role:'customer', phone:'07700 900123' },
  { id:'u2', name:'Sam Patel',    email:'staff@demo.com',    role:'staff',    branch:'wol', jobTitle:'Senior technician', hourlyRate:16.5, dailyRate:132, branchManager:true },
  { id:'u3', name:'Central Admin',email:'admin@demo.com',    role:'admin', superAdmin:true },

  // Branch technicians. Names match TECHS in src/data/repairs.js so assigned repairs line up
  // with real staff records rather than free-text technician names.
  { id:'u4', name:'Priya Shah',   email:'priya@virktech.co.uk',  role:'staff', branch:'wol', jobTitle:'Technician',        hourlyRate:14.5, dailyRate:116, phone:'07700 900201' },
  { id:'u5', name:'Aman Singh',   email:'aman@virktech.co.uk',   role:'staff', branch:'sid', jobTitle:'Senior technician', hourlyRate:16, dailyRate:128,   phone:'07700 900202', branchManager:true },
  { id:'u6', name:'Jason Clarke', email:'jason@virktech.co.uk',  role:'staff', branch:'blv', jobTitle:'Technician',        hourlyRate:14, dailyRate:112,   phone:'07700 900203', branchManager:true },
  { id:'u7', name:'Leah Morgan',  email:'leah@virktech.co.uk',   role:'staff', branch:'nel', jobTitle:'Technician',        hourlyRate:14, dailyRate:112,   phone:'07700 900204', branchManager:true },
  { id:'u8', name:'Ravi Chauhan', email:'ravi@virktech.co.uk',   role:'staff', branch:'orp', jobTitle:'Technician',        hourlyRate:13.5, dailyRate:108, phone:'07700 900205', branchManager:true },
  { id:'u9', name:'Nadia Hassan', email:'nadia@virktech.co.uk',  role:'staff', branch:'wbs', jobTitle:'Sales assistant',   hourlyRate:12.5, dailyRate:100, phone:'07700 900206', branchManager:true },
  { id:'u10',name:'Dan Whitfield',email:'dan@virktech.co.uk',    role:'staff', branch:'whr', jobTitle:'Technician',        hourlyRate:13.5, dailyRate:108, phone:'07700 900207', branchManager:true },
  { id:'u11',name:'Ellie Brooks', email:'ellie@virktech.co.uk',  role:'staff', branch:'nsa', jobTitle:'Sales assistant',   hourlyRate:12.5, dailyRate:100, phone:'07700 900208', branchManager:true },
  { id:'u12',name:'Marcus Reid',  email:'marcus@virktech.co.uk', role:'staff', branch:'blv', jobTitle:'Sales assistant',   hourlyRate:12, dailyRate:96,   phone:'07700 900209' },
]

// Defaults applied when a staff record predates the wage feature and has no rate set.
export const DEFAULT_HOURLY_RATE = 12
export const DEFAULT_DAILY_RATE = 96
