import { NextResponse } from 'next/server';
import { setSheetRows } from '@/lib/googleSheets';
import { hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const hashedAdminPw = await hashPassword('adminpassword123');
    const hashedJudgePw = await hashPassword('judge123');

    // 1. Users (1 Admin + 4 Accredited Judges)
    const users = [
      {
        id: 1,
        username: 'admin',
        password: hashedAdminPw,
        full_name: 'ASC Administrator',
        role: 'admin',
        approval_status: 'approved',
      },
      {
        id: 2,
        username: 'judge1',
        password: hashedJudgePw,
        full_name: 'Dr. Arthur Pendelton',
        role: 'judge',
        approval_status: 'approved',
      },
      {
        id: 3,
        username: 'judge2',
        password: hashedJudgePw,
        full_name: 'Prof. Clarissa Mendoza',
        role: 'judge',
        approval_status: 'approved',
      },
      {
        id: 4,
        username: 'judge3',
        password: hashedJudgePw,
        full_name: 'Atty. Ferdinand Marcos Santos',
        role: 'judge',
        approval_status: 'approved',
      },
      {
        id: 5,
        username: 'judge4',
        password: hashedJudgePw,
        full_name: 'Engr. Maria Rosario David',
        role: 'judge',
        approval_status: 'approved',
      },
    ];

    // 2. Event Types
    const event_types = [
      { id: 1, type_name: 'Pageant' },
      { id: 2, type_name: 'Cultural' },
      { id: 3, type_name: 'Academic' },
      { id: 4, type_name: 'Sports' },
      { id: 5, type_name: 'Literary' },
    ];

    // 3. Courses
    const courses = [
      { id: 1, course_name: 'Bachelor of Secondary Education' },
      { id: 2, course_name: 'Bachelor of Elementary Education' },
      { id: 3, course_name: 'Bachelor in Information Technology' },
      { id: 4, course_name: 'Bachelor in Industrial Technology' },
      { id: 5, course_name: 'Bachelor of Technical Teacher Education' },
      { id: 6, course_name: 'Bachelor of Science in Civil Engineering' },
      { id: 7, course_name: 'Bachelor of Science in Hotel & Restaurant Mgmt.' },
      { id: 8, course_name: 'Bachelor of Science in Agriculture' },
      { id: 9, course_name: 'Bachelor of Science in Business Administration' },
      { id: 10, course_name: 'Bachelor of Science in Tourism' },
      { id: 11, course_name: 'Bachelor of Science in Criminology' },
    ];

    // 4. Departments
    const departments = [
      { id: 1, department_name: 'Bachelor of Secondary Education', department_code: 'BSED' },
      { id: 2, department_name: 'Bachelor of Elementary Education', department_code: 'BEED' },
      { id: 3, department_name: 'Bachelor in Information Technology', department_code: 'BSIT' },
      { id: 4, department_name: 'Bachelor in Industrial Technology', department_code: 'BINDT' },
      { id: 5, department_name: 'Bachelor of Technical Teacher Education', department_code: 'BTTE' },
      { id: 6, department_name: 'Bachelor of Science in Civil Engineering', department_code: 'BSCE' },
      { id: 7, department_name: 'Bachelor of Science in Hotel & Restaurant Mgmt.', department_code: 'BSHRM' },
      { id: 8, department_name: 'Bachelor of Science in Agriculture', department_code: 'BSA' },
      { id: 9, department_name: 'Bachelor of Science in Business Administration', department_code: 'BSBA' },
      { id: 10, department_name: 'Bachelor of Science in Tourism', department_code: 'BST' },
      { id: 11, department_name: 'Bachelor of Science in Criminology', department_code: 'BSCrim' },
    ];

    // 5. Organizers
    const organizers = [
      { id: 1, organizer_name: 'Supreme Student Government (SSG)' },
      { id: 2, organizer_name: 'ASC Cultural & Arts Committee' },
      { id: 3, organizer_name: 'College of Arts & Sciences' },
      { id: 4, organizer_name: 'Sports & Athletics Unit' },
      { id: 5, organizer_name: 'College of Information Technology' },
    ];

    // 6. At Least 24 Registered Participants (Instituional Roster)
    const participants_registry = [
      { id: 1, name: 'Maria Angelica Santos', course_id: 3, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80' },
      { id: 2, name: 'Juan Carlos Dela Cruz', course_id: 6, year_level: '4th Year', image_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80' },
      { id: 3, name: 'Nicole Almazan', course_id: 2, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
      { id: 4, name: 'Christian Jay Reyes', course_id: 9, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
      { id: 5, name: 'Bea Alonzo Corpuz', course_id: 10, year_level: '1st Year', image_path: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80' },
      { id: 6, name: 'Joshua Fernandez', course_id: 8, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80' },
      { id: 7, name: 'Princess Diane Balag', course_id: 7, year_level: '4th Year', image_path: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80' },
      { id: 8, name: 'Mark Anthony Dayag', course_id: 4, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80' },
      { id: 9, name: 'Angel Mae Dacanay', course_id: 1, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80' },
      { id: 10, name: 'Kevin Paul Agcaoili', course_id: 3, year_level: '1st Year', image_path: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80' },
      { id: 11, name: 'Christine Joy Pasion', course_id: 11, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=400&q=80' },
      { id: 12, name: 'Gabriel Matthew Ramos', course_id: 6, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80' },
      { id: 13, name: 'Hannah Grace Valdez', course_id: 9, year_level: '4th Year', image_path: 'https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&w=400&q=80' },
      { id: 14, name: 'Ralph Lawrence Lucas', course_id: 5, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80' },
      { id: 15, name: 'Camille Rose Domingo', course_id: 10, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80' },
      { id: 16, name: 'Dave Bryan Malana', course_id: 8, year_level: '1st Year', image_path: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=400&q=80' },
      { id: 17, name: 'Stephanie Mae Guzman', course_id: 1, year_level: '4th Year', image_path: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=400&q=80' },
      { id: 18, name: 'John Michael Tolentino', course_id: 3, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&w=400&q=80' },
      { id: 19, name: 'Alyssa Marie Bugarin', course_id: 7, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=400&q=80' },
      { id: 20, name: 'Nathaniel Cruz', course_id: 4, year_level: '4th Year', image_path: 'https://images.unsplash.com/photo-1496345875659-11f7dd282d1d?auto=format&fit=crop&w=400&q=80' },
      { id: 21, name: 'Kimberly Mae Calagui', course_id: 2, year_level: '3rd Year', image_path: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=400&q=80' },
      { id: 22, name: 'Aaron Paul Quilang', course_id: 11, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&w=400&q=80' },
      { id: 23, name: 'Patricia Nicole Manuel', course_id: 6, year_level: '1st Year', image_path: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=400&q=80' },
      { id: 24, name: 'Jerome Vincent Aquino', course_id: 9, year_level: '2nd Year', image_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80' },
    ];

    // 7. Exactly 16 Distinct Events Across 5 Categories
    const events = [
      // --- Pageant (3) ---
      {
        id: 1,
        name: 'Mr. & Ms. ASC 2026 (Grand Coronation)',
        description: 'The flagship annual beauty, advocacy, and intelligence collegiate pageant of Apayao State College.',
        type: 'Pageant',
        participation_mode: 'Individual',
        department: 'Bachelor in Information Technology',
        organizer: 'Supreme Student Government (SSG)',
        academic_year: '2025-2026',
        start_date: '2026-02-14',
        end_date: '2026-02-14',
        status: 'Ongoing',
      },
      {
        id: 2,
        name: 'Mutya ng Apayao State College 2026',
        description: 'Inter-departmental search celebrating cultural heritage, environmental advocacy, and collegiate leadership.',
        type: 'Pageant',
        participation_mode: 'Individual',
        department: 'Bachelor of Science in Tourism',
        organizer: 'ASC Cultural & Arts Committee',
        academic_year: '2025-2026',
        start_date: '2026-03-01',
        end_date: '2026-03-02',
        status: 'Tabulating',
      },
      {
        id: 3,
        name: 'Search for Campus Ambassador of Goodwill',
        description: 'Annual advocacy-focused competition highlighting community outreach and academic excellence.',
        type: 'Pageant',
        participation_mode: 'Individual',
        department: 'Bachelor of Secondary Education',
        organizer: 'Supreme Student Government (SSG)',
        academic_year: '2025-2026',
        start_date: '2026-04-10',
        end_date: '2026-04-10',
        status: 'Upcoming',
      },

      // --- Cultural & Musical (4) ---
      {
        id: 4,
        name: 'Inter-Collegiate Vocal Solo Competition',
        description: 'Vocal prowess showdown featuring contemporary OPM and classic pop performances.',
        type: 'Cultural',
        participation_mode: 'Individual',
        department: 'Bachelor of Science in Hotel & Restaurant Mgmt.',
        organizer: 'ASC Cultural & Arts Committee',
        academic_year: '2025-2026',
        start_date: '2026-02-15',
        end_date: '2026-02-15',
        status: 'Ongoing',
      },
      {
        id: 5,
        name: 'Indigenous Cordillera Folk Dance Festival',
        description: 'Traditional tribal and folkloric dances showcasing the authentic culture of the Cordillera.',
        type: 'Cultural',
        participation_mode: 'Team',
        department: 'Bachelor of Elementary Education',
        organizer: 'ASC Cultural & Arts Committee',
        academic_year: '2025-2026',
        start_date: '2026-02-16',
        end_date: '2026-02-16',
        status: 'Tabulating',
      },
      {
        id: 6,
        name: 'Battle of the Acoustic Bands 2026',
        description: 'Live instrumental and acoustic musical arrangements featuring original collegiate compositions.',
        type: 'Cultural',
        participation_mode: 'Team',
        department: 'Bachelor in Industrial Technology',
        organizer: 'Supreme Student Government (SSG)',
        academic_year: '2025-2026',
        start_date: '2026-04-20',
        end_date: '2026-04-20',
        status: 'Upcoming',
      },
      {
        id: 7,
        name: 'Hip-Hop & Urban Street Dance Showdown',
        description: 'High-energy choreography and street dance competition between college departments.',
        type: 'Cultural',
        participation_mode: 'Team',
        department: 'Bachelor of Science in Criminology',
        organizer: 'ASC Cultural & Arts Committee',
        academic_year: '2025-2026',
        start_date: '2026-01-28',
        end_date: '2026-01-28',
        status: 'Completed',
      },

      // --- Academic & Tech (3) ---
      {
        id: 8,
        name: 'General Information & Collegiate Quiz Bowl',
        description: 'Intense inter-collegiate battle of wits spanning history, science, pop culture, and current affairs.',
        type: 'Academic',
        participation_mode: 'Individual',
        department: 'College of Arts & Sciences',
        organizer: 'College of Arts & Sciences',
        academic_year: '2025-2026',
        start_date: '2026-02-18',
        end_date: '2026-02-18',
        status: 'Ongoing',
      },
      {
        id: 9,
        name: 'Inter-Department Parliamentary Debate',
        description: 'Oxford-Oregon debate championship tackling critical national and environmental socio-political policies.',
        type: 'Academic',
        participation_mode: 'Team',
        department: 'Bachelor of Science in Business Administration',
        organizer: 'College of Arts & Sciences',
        academic_year: '2025-2026',
        start_date: '2026-02-20',
        end_date: '2026-02-20',
        status: 'Tabulating',
      },
      {
        id: 10,
        name: 'Algorithmic Coding & Web Dev Hackathon',
        description: 'Speed programming, UI/UX system design, and algorithmic problem-solving competition.',
        type: 'Academic',
        participation_mode: 'Team',
        department: 'Bachelor in Information Technology',
        organizer: 'College of Information Technology',
        academic_year: '2025-2026',
        start_date: '2026-01-25',
        end_date: '2026-01-25',
        status: 'Completed',
      },

      // --- Literary & Speech (3) ---
      {
        id: 11,
        name: 'Extemporaneous Speaking & Oration Contest',
        description: 'On-the-spot speech delivery evaluated on logic, delivery, poise, and articulation.',
        type: 'Literary',
        participation_mode: 'Individual',
        department: 'Bachelor of Secondary Education',
        organizer: 'College of Arts & Sciences',
        academic_year: '2025-2026',
        start_date: '2026-02-22',
        end_date: '2026-02-22',
        status: 'Ongoing',
      },
      {
        id: 12,
        name: 'Spoken Word Poetry & Balagtasan Fest',
        description: 'Creative poetic performance in Ilocano, Tagalog, and English expressing youth ideals.',
        type: 'Literary',
        participation_mode: 'Individual',
        department: 'Bachelor of Technical Teacher Education',
        organizer: 'ASC Cultural & Arts Committee',
        academic_year: '2025-2026',
        start_date: '2026-02-24',
        end_date: '2026-02-24',
        status: 'Tabulating',
      },
      {
        id: 13,
        name: 'Collegiate Essay Writing Championship',
        description: 'In-depth analytical writing competition centered on higher education innovations in Apayao.',
        type: 'Literary',
        participation_mode: 'Individual',
        department: 'Bachelor of Science in Agriculture',
        organizer: 'College of Arts & Sciences',
        academic_year: '2025-2026',
        start_date: '2026-01-20',
        end_date: '2026-01-20',
        status: 'Completed',
      },

      // --- Sports & Performing (3) ---
      {
        id: 14,
        name: 'Inter-Department Cheerdance Competition',
        description: 'Grand athletic stunts, pyramid formations, tumbling, and dance choreography championship.',
        type: 'Sports',
        participation_mode: 'Team',
        department: 'Sports & Athletics Unit',
        organizer: 'Sports & Athletics Unit',
        academic_year: '2025-2026',
        start_date: '2026-02-26',
        end_date: '2026-02-26',
        status: 'Ongoing',
      },
      {
        id: 15,
        name: 'Campus Esports Tournament (MLBB & Valorant)',
        description: 'Competitive collegiate gaming championship broadcast live with real-time scoring.',
        type: 'Sports',
        participation_mode: 'Team',
        department: 'Bachelor in Information Technology',
        organizer: 'Supreme Student Government (SSG)',
        academic_year: '2025-2026',
        start_date: '2026-02-27',
        end_date: '2026-02-27',
        status: 'Tabulating',
      },
      {
        id: 16,
        name: 'Collegiate Drum & Lyre Field Exhibition',
        description: 'Synchronized musical precision and field drill choreography competition.',
        type: 'Sports',
        participation_mode: 'Team',
        department: 'Sports & Athletics Unit',
        organizer: 'Sports & Athletics Unit',
        academic_year: '2025-2026',
        start_date: '2026-05-02',
        end_date: '2026-05-02',
        status: 'Upcoming',
      },
    ];

    // 8. Event Judges Assignments
    const event_judges: any[] = [];
    let ejId = 1;
    // Assign 3-4 judges to active competitions
    for (let eId = 1; eId <= 16; eId++) {
      event_judges.push({ id: ejId++, event_id: eId, user_id: 2 });
      event_judges.push({ id: ejId++, event_id: eId, user_id: 3 });
      event_judges.push({ id: ejId++, event_id: eId, user_id: 4 });
      if (eId <= 5) {
        event_judges.push({ id: ejId++, event_id: eId, user_id: 5 });
      }
    }

    // 9. Candidates assigned to Events
    const candidates: any[] = [];
    let candId = 1;

    // Event 1: Mr. & Ms. ASC 2026 (4 contestants)
    candidates.push({ id: candId++, event_id: 1, name: 'Maria Angelica Santos', course_id: 3, year_level: '3rd Year', order_number: 1, registry_id: 1, image_path: participants_registry[0].image_path });
    candidates.push({ id: candId++, event_id: 1, name: 'Juan Carlos Dela Cruz', course_id: 6, year_level: '4th Year', order_number: 2, registry_id: 2, image_path: participants_registry[1].image_path });
    candidates.push({ id: candId++, event_id: 1, name: 'Nicole Almazan', course_id: 2, year_level: '2nd Year', order_number: 3, registry_id: 3, image_path: participants_registry[2].image_path });
    candidates.push({ id: candId++, event_id: 1, name: 'Christian Jay Reyes', course_id: 9, year_level: '3rd Year', order_number: 4, registry_id: 4, image_path: participants_registry[3].image_path });

    // Event 2: Mutya ng Apayao (4 contestants)
    candidates.push({ id: candId++, event_id: 2, name: 'Bea Alonzo Corpuz', course_id: 10, year_level: '1st Year', order_number: 1, registry_id: 5, image_path: participants_registry[4].image_path });
    candidates.push({ id: candId++, event_id: 2, name: 'Princess Diane Balag', course_id: 7, year_level: '4th Year', order_number: 2, registry_id: 7, image_path: participants_registry[6].image_path });
    candidates.push({ id: candId++, event_id: 2, name: 'Angel Mae Dacanay', course_id: 1, year_level: '2nd Year', order_number: 3, registry_id: 9, image_path: participants_registry[8].image_path });
    candidates.push({ id: candId++, event_id: 2, name: 'Christine Joy Pasion', course_id: 11, year_level: '3rd Year', order_number: 4, registry_id: 11, image_path: participants_registry[10].image_path });

    // Event 4: Vocal Solo (4 contestants)
    candidates.push({ id: candId++, event_id: 4, name: 'Kevin Paul Agcaoili', course_id: 3, year_level: '1st Year', order_number: 1, registry_id: 10, image_path: participants_registry[9].image_path });
    candidates.push({ id: candId++, event_id: 4, name: 'Hannah Grace Valdez', course_id: 9, year_level: '4th Year', order_number: 2, registry_id: 13, image_path: participants_registry[12].image_path });
    candidates.push({ id: candId++, event_id: 4, name: 'Joshua Fernandez', course_id: 8, year_level: '2nd Year', order_number: 3, registry_id: 6, image_path: participants_registry[5].image_path });
    candidates.push({ id: candId++, event_id: 4, name: 'Camille Rose Domingo', course_id: 10, year_level: '2nd Year', order_number: 4, registry_id: 15, image_path: participants_registry[14].image_path });

    // Event 8: Quiz Bowl (4 contestants)
    candidates.push({ id: candId++, event_id: 8, name: 'Gabriel Matthew Ramos', course_id: 6, year_level: '2nd Year', order_number: 1, registry_id: 12, image_path: participants_registry[11].image_path });
    candidates.push({ id: candId++, event_id: 8, name: 'Ralph Lawrence Lucas', course_id: 5, year_level: '3rd Year', order_number: 2, registry_id: 14, image_path: participants_registry[13].image_path });
    candidates.push({ id: candId++, event_id: 8, name: 'John Michael Tolentino', course_id: 3, year_level: '2nd Year', order_number: 3, registry_id: 18, image_path: participants_registry[17].image_path });
    candidates.push({ id: candId++, event_id: 8, name: 'Stephanie Mae Guzman', course_id: 1, year_level: '4th Year', order_number: 4, registry_id: 17, image_path: participants_registry[16].image_path });

    // Event 11: Extemporaneous Speaking (4 contestants)
    candidates.push({ id: candId++, event_id: 11, name: 'Dave Bryan Malana', course_id: 8, year_level: '1st Year', order_number: 1, registry_id: 16, image_path: participants_registry[15].image_path });
    candidates.push({ id: candId++, event_id: 11, name: 'Mark Anthony Dayag', course_id: 4, year_level: '3rd Year', order_number: 2, registry_id: 8, image_path: participants_registry[7].image_path });
    candidates.push({ id: candId++, event_id: 11, name: 'Alyssa Marie Bugarin', course_id: 7, year_level: '3rd Year', order_number: 3, registry_id: 19, image_path: participants_registry[18].image_path });
    candidates.push({ id: candId++, event_id: 11, name: 'Nathaniel Cruz', course_id: 4, year_level: '4th Year', order_number: 4, registry_id: 20, image_path: participants_registry[19].image_path });

    // 10. Event Portions (Pageant Portions, Cultural Portions)
    const event_portions = [
      // Event 1: Mr. & Ms. ASC
      { id: 1, event_id: 1, portion_name: 'Preliminary Interview', percentage: 25, order_number: 1, status: 'Completed' },
      { id: 2, event_id: 1, portion_name: 'Swimsuit & Fitness', percentage: 20, order_number: 2, status: 'Completed' },
      { id: 3, event_id: 1, portion_name: 'Evening Gown / Formal Attire', percentage: 25, order_number: 3, status: 'Ongoing' },
      { id: 4, event_id: 1, portion_name: 'Final Q & A Round', percentage: 30, order_number: 4, status: 'Upcoming' },

      // Event 2: Mutya ng Apayao
      { id: 5, event_id: 2, portion_name: 'Indigenous Attire', percentage: 30, order_number: 1, status: 'Completed' },
      { id: 6, event_id: 2, portion_name: 'Advocacy Pitch', percentage: 40, order_number: 2, status: 'Completed' },
      { id: 7, event_id: 2, portion_name: 'Poise and Demeanor', percentage: 30, order_number: 3, status: 'Completed' },

      // Event 4: Vocal Solo
      { id: 8, event_id: 4, portion_name: 'Main Performance Round', percentage: 100, order_number: 1, status: 'Ongoing' },

      // Event 8: Quiz Bowl
      { id: 9, event_id: 8, portion_name: 'Elimination Round', percentage: 40, order_number: 1, status: 'Completed' },
      { id: 10, event_id: 8, portion_name: 'Championship Round', percentage: 60, order_number: 2, status: 'Ongoing' },
    ];

    // 11. Criteria Definitions
    const criteria = [
      // Event 1 - Portion 1 (Interview 25%)
      { id: 1, event_id: 1, portion_id: 1, name: 'Content & Substance', max_score: 100, percentage: 50 },
      { id: 2, event_id: 1, portion_id: 1, name: 'Delivery & Diction', max_score: 100, percentage: 50 },

      // Event 1 - Portion 2 (Swimsuit 20%)
      { id: 3, event_id: 1, portion_id: 2, name: 'Poise, Bearing & Projection', max_score: 100, percentage: 60 },
      { id: 4, event_id: 1, portion_id: 2, name: 'Physical Fitness & Tone', max_score: 100, percentage: 40 },

      // Event 1 - Portion 3 (Evening Gown 25%)
      { id: 5, event_id: 1, portion_id: 3, name: 'Elegance & Stage Presence', max_score: 100, percentage: 50 },
      { id: 6, event_id: 1, portion_id: 3, name: 'Gown Fit & Overall Impact', max_score: 100, percentage: 50 },

      // Event 1 - Portion 4 (Q&A 30%)
      { id: 7, event_id: 1, portion_id: 4, name: 'Spontaneity & Wit', max_score: 100, percentage: 50 },
      { id: 8, event_id: 1, portion_id: 4, name: 'Relevance to Theme', max_score: 100, percentage: 50 },

      // Event 2 Criteria
      { id: 9, event_id: 2, portion_id: 5, name: 'Cultural Authenticity', max_score: 100, percentage: 100 },
      { id: 10, event_id: 2, portion_id: 6, name: 'Feasibility & Clarity', max_score: 100, percentage: 100 },
      { id: 11, event_id: 2, portion_id: 7, name: 'Grace & Poise', max_score: 100, percentage: 100 },

      // Event 4 Criteria (Vocal Solo)
      { id: 12, event_id: 4, portion_id: 8, name: 'Vocal Quality & Tone', max_score: 100, percentage: 40 },
      { id: 13, event_id: 4, portion_id: 8, name: 'Timing & Rhythm', max_score: 100, percentage: 30 },
      { id: 14, event_id: 4, portion_id: 8, name: 'Stage Presence & Mastery', max_score: 100, percentage: 30 },
    ];

    // 12. Realistic Judge Scores for Live Tabulation Audit
    const scores: any[] = [];
    let scoreId = 1;

    // Generate scores for Event 1 candidates (IDs 1..4) from judges (IDs 2, 3, 4)
    const event1Cands = [1, 2, 3, 4];
    const event1Judges = [2, 3, 4];
    const event1Crit = [1, 2, 3, 4, 5, 6];

    for (const jId of event1Judges) {
      for (const cId of event1Cands) {
        for (const crId of event1Crit) {
          // Semi-randomized realistic collegiate scores between 88 and 97
          const base = 88 + (cId * 2) - (crId % 3);
          const scoreVal = Math.min(98, Math.max(85, base + ((jId + crId) % 4)));
          scores.push({
            id: scoreId++,
            event_id: 1,
            judge_id: jId,
            candidate_id: cId,
            criteria_id: crId,
            score: scoreVal,
          });
        }
      }
    }

    // Save all to Sheets/Memory store concurrently
    await Promise.all([
      setSheetRows('users', users),
      setSheetRows('event_types', event_types),
      setSheetRows('courses', courses),
      setSheetRows('departments', departments),
      setSheetRows('organizers', organizers),
      setSheetRows('participants_registry', participants_registry),
      setSheetRows('events', events),
      setSheetRows('event_judges', event_judges),
      setSheetRows('candidates', candidates),
      setSheetRows('event_portions', event_portions),
      setSheetRows('criteria', criteria),
      setSheetRows('scores', scores),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Successfully populated collegiate sample dataset!',
      details: {
        eventsCount: events.length,
        participantsCount: participants_registry.length,
        judgesCount: users.filter((u) => u.role === 'judge').length,
        scoresCount: scores.length,
      },
    });
  } catch (error: any) {
    console.error('Populate sample error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
