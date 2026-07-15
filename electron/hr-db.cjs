const path = require('path');
const fs = require('fs');
const bcrypt = require("bcryptjs"); // Required for employee-user linked password hashing

/**
 * HR Database Module
 * Handles all HR-specific table schemas, migrations, and data logic.
 */
module.exports = (db, toCamelCase, deviceId) => {
  console.log('[HR-DB] Initializing HR Module...');

  // 1. SCHEMA INITIALIZATION / MIGRATIONS
  try {
    // 1.1 Create/Upgrade leave_balances table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        leave_type TEXT NOT NULL,
        total_days REAL DEFAULT 0,
        used_days REAL DEFAULT 0,
        year INTEGER NOT NULL,
        updated_at TEXT DEFAULT (datetime('now')),
        sync_status INTEGER DEFAULT 0,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `).run();

    // 1.2 Constraint Relaxation for Shifts (Flexible Timing)
    const shiftsTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='shifts'").get();
    if (shiftsTable && shiftsTable.sql.includes("CHECK(type IN ('morning', 'evening', 'full'))")) {
      console.log("[HR-DB] Migrating shifts table to relax timing constraints...");
      db.transaction(() => {
        db.exec("ALTER TABLE shifts RENAME TO shifts_old");
        db.exec(`
          CREATE TABLE shifts (
            id TEXT PRIMARY KEY,
            company_id TEXT,
            employee_id TEXT NOT NULL,
            store_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            type TEXT NOT NULL, 
            status TEXT CHECK(status IN ('assigned', 'completed', 'cancelled')) DEFAULT 'assigned',
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            sync_status INTEGER DEFAULT 0,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (store_id) REFERENCES stores(id)
          )
        `);
        db.exec(`
          INSERT INTO shifts (id, company_id, employee_id, store_id, start_time, end_time, type, status, updated_at, sync_status)
          SELECT id, company_id, employee_id, store_id, start_time, end_time, type, status, updated_at, sync_status 
          FROM shifts_old
        `);
        db.exec("DROP TABLE shifts_old");
      })();
    }

    // 1.3 Constraint Relaxation for Leaves
    const leavesTable = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='leaves'").get();
    if (leavesTable && leavesTable.sql.includes("CHECK(type IN ('sick', 'casual', 'earned', 'unpaid'))")) {
      console.log("[HR-DB] Migrating leaves table to relax type constraints...");
      db.transaction(() => {
        db.exec("ALTER TABLE leaves RENAME TO leaves_old");
        db.exec(`
          CREATE TABLE leaves (
            id TEXT PRIMARY KEY,
            company_id TEXT,
            employee_id TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            type TEXT NOT NULL, 
            reason TEXT,
            status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
            store_id TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            sync_status INTEGER DEFAULT 0,
            FOREIGN KEY (employee_id) REFERENCES employees(id),
            FOREIGN KEY (store_id) REFERENCES stores(id)
          )
        `);
        db.exec(`
          INSERT INTO leaves (id, company_id, employee_id, start_date, end_date, type, reason, status, store_id, updated_at, sync_status)
          SELECT id, company_id, employee_id, start_date, end_date, type, reason, status, store_id, updated_at, sync_status
          FROM leaves_old
        `);
        db.exec("DROP TABLE leaves_old");
      })();
    }
  } catch (err) {
    console.error('[HR-DB] Schema Initialization ERROR:', err.message);
  }

  // 2. HELPERS IMPLEMENTATION
  return {
    // 2.1 Attendance
    checkIn: (employeeId, storeId, companyId) => {
      const id = `att-${Date.now()}`;
      const eid = String(employeeId).toLowerCase();
      const emp = db.prepare("SELECT company_id FROM employees WHERE id = ?").get(eid);
      const cId = companyId || (emp ? emp.company_id : null);
      if (!cId) throw new Error("company_id is required for Check-In.");

      return db.prepare(`
        INSERT INTO attendance (id, company_id, employee_id, date, check_in, status, store_id, updated_at, sync_status)
        VALUES (?, ?, ?, date('now'), time('now'), 'present', ?, datetime('now'), 0)
      `).run(id, cId, eid, storeId);
    },

    checkOut: (employeeId) => {
      const eid = String(employeeId).toLowerCase();
      return db.prepare(`
        UPDATE attendance 
        SET check_out = time('now'), updated_at = datetime('now'), sync_status = 0 
        WHERE employee_id = ? AND date = date('now') AND check_out IS NULL
      `).run(eid);
    },

    getAttendance: (employeeId, startDate, endDate) => {
      if (!startDate) {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        startDate = d.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      }

      const eid = employeeId ? String(employeeId).toLowerCase() : null;

      if (eid) {
        return db.prepare(`
          SELECT a.*, u.name as name, u.avatar 
          FROM attendance a 
          LEFT JOIN employees e ON a.employee_id = e.id 
          LEFT JOIN users u ON e.user_id = u.id
          WHERE a.employee_id = ? AND a.date BETWEEN ? AND ? 
          ORDER BY a.date DESC
        `).all(eid, startDate, endDate).map(toCamelCase);
      } else {
        return db.prepare(`
          SELECT a.*, u.name as name, u.avatar 
          FROM attendance a 
          LEFT JOIN employees e ON a.employee_id = e.id 
          LEFT JOIN users u ON e.user_id = u.id 
          WHERE a.date BETWEEN ? AND ? 
          ORDER BY a.date DESC
        `).all(startDate, endDate).map(toCamelCase);
      }
    },

    // 2.2 Payroll
    getPayroll: (storeId, companyId, employeeId) => {
      let query = `
        SELECT p.*, u.name as user_name, e.department, e.designation
        FROM payroll p
        LEFT JOIN employees e ON p.employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE p.store_id = ?
      `;
      const params = [storeId];
      if (companyId) {
        query += ` AND p.company_id = ? `;
        params.push(companyId);
      }
      if (employeeId) {
        query += ` AND p.employee_id = ? `;
        params.push(String(employeeId).toLowerCase());
      }
      query += ` ORDER BY p.year DESC, p.month DESC `;
      return db.prepare(query).all(...params).map(toCamelCase);
    },

    addPayroll: (p) => {
      const empId = String(p.employeeId || '').toLowerCase();
      const companyId = p.companyId || db.prepare("SELECT company_id FROM employees WHERE id = ?").get(empId)?.company_id;
      
      if (!companyId) throw new Error("companyId is required for Payroll.");

      const currentDate = new Date();
      const targetMonth = p.month !== undefined ? p.month : currentDate.getMonth() + 1;
      const targetYear = p.year !== undefined ? p.year : currentDate.getFullYear();

      return db.prepare(`
        INSERT INTO payroll(id, company_id, employee_id, month, year, basic_salary, deductions, allowances, net_salary, status, store_id, updated_at, sync_status)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(
        p.id || `pay-${Date.now()}`, companyId, empId, 
        targetMonth, targetYear, p.basicSalary || 0, p.deductions || 0, 
        p.allowances || 0, p.netSalary || 0, p.status || 'draft', p.storeId
      );
    },

    updatePayrollStatus: (id, status) => {
      return db.prepare("UPDATE payroll SET status = ?, updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(status, id);
    },

    // 2.3 Leaves & Balances
    getLeaveBalances: (employeeId, companyId) => {
      const eid = String(employeeId).toLowerCase();
      let query = 'SELECT * FROM leave_balances WHERE employee_id = ?';
      const params = [eid];
      if (companyId) {
        query += ' AND company_id = ?';
        params.push(companyId);
      }
      return db.prepare(query).all(...params).map(toCamelCase);
    },

    setLeaveBalance: (balance) => {
      const eid = String(balance.employeeId).toLowerCase();
      const year = balance.year || new Date().getFullYear();
      
      const existing = db.prepare("SELECT id FROM leave_balances WHERE employee_id = ? AND leave_type = ? AND year = ?").get(eid, balance.leaveType, year);

      if (existing) {
        return db.prepare(`
          UPDATE leave_balances 
          SET total_days = ?, updated_at = datetime('now'), sync_status = 0
          WHERE id = ?
        `).run(balance.totalDays, existing.id);
      } else {
        const id = balance.id || `bal-${Date.now()}-${eid}`;
        return db.prepare(`
          INSERT INTO leave_balances (id, company_id, employee_id, leave_type, total_days, used_days, year)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, balance.companyId, eid, balance.leaveType, 
          balance.totalDays, balance.usedDays || 0, year
        );
      }
    },

    applyLeave: (leave) => {
      const empId = String(leave.employeeId).toLowerCase();
      const emp = db.prepare("SELECT company_id, store_id FROM employees WHERE id = ?").get(empId);
      if (!emp) throw new Error("Employee profile not found.");

      const companyId = leave.companyId || emp.company_id;
      const storeId = leave.storeId || emp.store_id || 'store-1';

      if (!companyId) throw new Error("company_id is required for data scoping.");

      const id = leave.id || `lv-${Date.now()}`;
      return db.prepare(`
        INSERT INTO leaves (id, company_id, employee_id, start_date, end_date, type, reason, status, store_id, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(id, companyId, empId, leave.startDate, leave.endDate, leave.type, leave.reason, 'pending', storeId);
    },

    getLeaves: (storeId, companyId, employeeId) => {
      let query = `
        SELECT l.*, u.name as user_name, u.role as user_role 
        FROM leaves l 
        LEFT JOIN employees e ON l.employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id 
        WHERE l.store_id = ?
      `;
      const params = [storeId];
      if (companyId) {
        query += ' AND l.company_id = ?';
        params.push(companyId);
      }
      if (employeeId) {
        query += ' AND l.employee_id = ?';
        params.push(String(employeeId).toLowerCase());
      }
      query += ' ORDER BY l.start_date DESC';
      return db.prepare(query).all(...params).map(toCamelCase);
    },

    updateLeaveStatus: (id, status) => {
      const transaction = db.transaction(() => {
        db.prepare("UPDATE leaves SET status = ?, updated_at = datetime('now'), sync_status = 0 WHERE id = ?").run(status, id);

        if (status === 'approved') {
          const leave = db.prepare("SELECT * FROM leaves WHERE id = ?").get(id);
          if (leave) {
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const year = start.getFullYear();

            // Increment used_days in leave_balances
            db.prepare(`
              UPDATE leave_balances 
              SET used_days = used_days + ?, updated_at = datetime('now'), sync_status = 0
              WHERE employee_id = ? AND leave_type = ? AND year = ?
            `).run(days, leave.employee_id, leave.type, year);
          }
        }
      });
      transaction();
      return true;
    },

    // 2.4 Shifts
    getShifts: (storeId, startDate, endDate, employeeId, companyId) => {
      let query = `
        SELECT s.*, u.name as user_name, u.email as user_email, u.role as user_role 
        FROM shifts s 
        LEFT JOIN employees e ON LOWER(s.employee_id) = LOWER(e.id)
        LEFT JOIN users u ON e.user_id = u.id 
        WHERE s.store_id = ?
      `;
      const params = [storeId];
      if (startDate && endDate) {
        query += ` AND s.start_time BETWEEN ? AND ? `;
        params.push(startDate, endDate);
      }
      if (employeeId) {
        query += ` AND LOWER(s.employee_id) = LOWER(?) `;
        params.push(String(employeeId).toLowerCase());
      }
      if (companyId) {
        query += ` AND s.company_id = ? `;
        params.push(companyId);
      }
      query += ` ORDER BY s.start_time ASC`;
      return db.prepare(query).all(...params).map(toCamelCase);
    },

    assignShift: (shift) => {
      const empId = String(shift.employeeId).toLowerCase();
      const emp = db.prepare("SELECT company_id FROM employees WHERE id = ?").get(empId);
      const companyId = shift.companyId || (emp ? emp.company_id : null);

      return db.prepare(`
        INSERT INTO shifts (id, company_id, employee_id, store_id, start_time, end_time, type, status, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(
        shift.id || `sh-${Date.now()}`, companyId, empId, shift.storeId, 
        shift.startTime, shift.endTime, shift.type, shift.status || 'assigned'
      );
    },

    deleteShift: (id) => {
      return db.prepare("UPDATE shifts SET status = 'cancelled', sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id);
    },

    // 2.5 Employees
    getEmployees: (storeId) => {
      return db.prepare(`
        SELECT e.*, u.name as user_name, u.email as user_email, u.role as user_role, u.avatar as user_avatar, u.is_active as user_is_active
        FROM employees e
        LEFT JOIN users u ON e.user_id = u.id
        WHERE e.store_id = ? AND e.is_deleted = 0
        ORDER BY e.updated_at DESC
      `).all(storeId).map(e => {
        const camelE = toCamelCase(e);
        return {
          ...camelE,
          user: {
            name: camelE.name || e.user_name || 'Staff Member',
            email: camelE.email || e.user_email || '',
            role: e.user_role || 'employee',
            isActive: e.user_is_active === 1,
            avatar: e.user_avatar || null
          },
          documents: camelE.documents ? JSON.parse(camelE.documents) : []
        };
      });
    },

    addEmployee: (data) => {
      const createBoth = db.transaction(() => {
        let userId = data.userId;
        if (data.id && !userId) {
          const emp = db.prepare("SELECT user_id FROM employees WHERE id = ?").get(data.id);
          if (emp) userId = emp.user_id;
        }

        let existingUser = null;
        if (userId) {
          existingUser = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
        }
        if (!existingUser && data.email) {
          existingUser = db.prepare("SELECT * FROM users WHERE email = ? AND is_deleted = 0").get(data.email);
          if (existingUser && existingUser.id !== data.userId) {
             throw new Error("UNIQUE constraint failed: users.email");
          }
          if (existingUser) userId = existingUser.id;
        }

        const nameParts = (data.name || '').split(' ');
        const firstName = data.firstName || nameParts[0] || '';
        const lastName = data.lastName || nameParts.slice(1).join(' ') || '';
        const role = data.role || 'employee';
        const isStaff = (role !== 'employee' && role !== 'user') ? 1 : 0;

        if (existingUser) {
          let passwordUpdate = "";
          const params = [data.name || existingUser.name, data.email || existingUser.email, data.email || existingUser.username, firstName, lastName, role, isStaff, data.storeId, userId];
          if (data.password) {
              passwordUpdate = ", password = ?";
              params.splice(5, 0, bcrypt.hashSync(data.password, 10));
          }

          db.prepare(`
            UPDATE users SET 
              name = ?, email = ?, username = ?, first_name = ?, last_name = ?
              ${passwordUpdate}, role = ?, is_staff = ?, 
              is_active = 1, is_deleted = 0, store_id = ?, device_id = ?, 
              updated_at = datetime('now'), sync_status = 0
            WHERE id = ?
          `).run(...params, deviceId, userId);
        } else {
          userId = userId || `user-${Date.now()}`;
          const password = data.password ? bcrypt.hashSync(data.password, 10) : bcrypt.hashSync('ChangeMe123!', 10);
          db.prepare(`
            INSERT INTO users(id, name, email, username, first_name, last_name, password, role, is_staff, is_active, is_deleted, store_id, device_id, updated_at, sync_status)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, datetime('now'), 0)
          `).run(userId, data.name, data.email, data.email, firstName, lastName, password, role, isStaff, data.storeId, deviceId);
        }

        let employeeId = data.id || `emp-${Date.now()}`;
        const existingEmp = db.prepare("SELECT id FROM employees WHERE id = ? OR user_id = ?").get(employeeId, userId);

        const cleanSalary = (val) => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          return parseFloat(String(val).replace(/[^0-9.]/g, '')) || 0;
        };

        if (existingEmp) {
          employeeId = existingEmp.id;
          db.prepare(`
            UPDATE employees SET 
              department = ?, designation = ?, salary = ?, joining_date = ?, 
              documents = ?, store_id = ?, is_deleted = 0, 
              updated_at = datetime('now'), sync_status = 0
            WHERE id = ?
          `).run(data.department || 'General', data.designation || data.role?.replace(/_/g, ' ').toUpperCase() || 'Staff', cleanSalary(data.salary), data.joiningDate || new Date().toISOString().split('T')[0], JSON.stringify(data.documents || []), data.storeId, employeeId);
        } else {
          let companyId = data.companyId || (data.user ? data.user.companyId : null);
          if (!companyId) {
              const store = db.prepare("SELECT company_id FROM stores WHERE id = ?").get(data.storeId);
              if (store && store.company_id) companyId = store.company_id;
              else {
                  const fallback = db.prepare("SELECT company_id FROM users WHERE company_id IS NOT NULL LIMIT 1").get();
                  if (fallback) companyId = fallback.company_id;
                  else throw new Error("companyId is required for new Employee creation.");
              }
          }

          db.prepare(`
            INSERT INTO employees(id, company_id, user_id, department, designation, salary, joining_date, documents, store_id, is_deleted, updated_at, sync_status)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), 0)
          `).run(employeeId, companyId, userId, data.department || 'General', data.designation || data.role?.replace(/_/g, ' ').toUpperCase() || 'Staff', cleanSalary(data.salary), data.joiningDate || new Date().toISOString().split('T')[0], JSON.stringify(data.documents || []), data.storeId);
        }
        return employeeId;
      });

      const finalEmployeeId = createBoth();
      const emp = db.prepare(`SELECT e.*, u.name as user_name, u.email as user_email, u.role as user_role, u.avatar as user_avatar FROM employees e LEFT JOIN users u ON e.user_id = u.id WHERE e.id = ?`).get(finalEmployeeId);
      if (!emp) return null;
      const camelE = toCamelCase(emp);
      return { ...camelE, user: { name: camelE.name || emp.user_name || '', email: camelE.email || emp.user_email || '', role: emp.user_role || 'employee' }, documents: camelE.documents ? JSON.parse(camelE.documents) : [] };
    },

    updateEmployee: (id, updates) => {
      const empFields = [];
      const empValues = [];
      const userFields = [];
      const userValues = [];
      
      const fieldMap = {
        department: 'department',
        designation: 'designation',
        salary: 'salary',
        joiningDate: 'joining_date',
        documents: 'documents'
      };

      Object.keys(updates).forEach(key => {
        if (fieldMap[key]) {
          empFields.push(`${fieldMap[key]} = ?`);
          empValues.push(key === 'documents' ? JSON.stringify(updates[key]) : updates[key]);
        } else if (key === 'name' || key === 'email') {
          userFields.push(`${key} = ?`);
          userValues.push(updates[key]);
        }
      });

      if (empFields.length > 0) {
        empValues.push(id);
        db.prepare(`UPDATE employees SET ${empFields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ?`).run(...empValues);
      }

      if (userFields.length > 0) {
        const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(id);
        if (emp && emp.user_id) {
          userValues.push(emp.user_id);
          db.prepare(`UPDATE users SET ${userFields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ?`).run(...userValues);
        }
      }

      // Sync with user account if name/email/role changed
      const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(id);
      if (emp && emp.user_id) {
        const uFields = [];
        const uValues = [];
        if (updates.name) { uFields.push("name = ?"); uValues.push(updates.name); }
        if (updates.email) { uFields.push("email = ?"); uValues.push(updates.email); }
        if (uFields.length > 0) {
          uValues.push(emp.user_id);
          db.prepare(`UPDATE users SET ${uFields.join(', ')}, updated_at = datetime('now'), sync_status = 0 WHERE id = ?`).run(...uValues);
        }
      }
      return true;
    },

    deleteEmployee: (id) => {
      const transaction = db.transaction(() => {
        const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(id);
        if (emp && emp.user_id) {
          // Prepend __DEL__ to avoid unique constraint conflicts in Django on email/username
          const user = db.prepare('SELECT email, username FROM users WHERE id = ?').get(emp.user_id);
          if (user) {
            const newEmail = user.email && !user.email.startsWith('__DEL__') ? `__DEL__${user.email}` : user.email;
            const newUsername = user.username && !user.username.startsWith('__DEL__') ? `__DEL__${user.username}` : user.username;
            db.prepare("UPDATE users SET email = ?, username = ?, is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(newEmail, newUsername, emp.user_id);
          } else {
            db.prepare("UPDATE users SET is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(emp.user_id);
          }
        }
        db.prepare("UPDATE employees SET is_deleted = 1, sync_status = 0, updated_at = datetime('now') WHERE id = ?").run(id);
      });
      transaction();
      return { success: true };
    },

    // 2.6 Candidates
    getCandidates: (storeId) => {
      return db.prepare(`SELECT * FROM candidates WHERE store_id = ? ORDER BY updated_at DESC`).all(storeId).map(toCamelCase);
    },

    addCandidate: (c) => {
      return db.prepare(`
        INSERT INTO candidates(id, company_id, name, email, phone, role, status, resume_text, score, skills, store_id, updated_at, sync_status)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(c.id, c.companyId, c.name, c.email, c.phone, c.role, c.status || 'applied', c.resumeText, c.score || 0, c.skills, c.storeId);
    },

    updateCandidateStatus: (id, status) => {
      return db.prepare("UPDATE candidates SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    },

    // 2.7 Performance
    getPerformanceReviews: (storeId, companyId, employeeId) => {
      let query = `
        SELECT pr.*, u.name as reviewer_name, e.designation
        FROM performance_reviews pr
        LEFT JOIN employees e ON pr.employee_id = e.id
        LEFT JOIN users u ON pr.reviewer_id = u.id
        WHERE pr.store_id = ? AND pr.is_deleted = 0
      `;
      const params = [storeId];
      if (companyId) {
        query += ` AND pr.company_id = ? `;
        params.push(companyId);
      }
      if (employeeId) {
        query += ` AND pr.employee_id = ? `;
        params.push(String(employeeId).toLowerCase());
      }
      return db.prepare(query).all(...params).map(toCamelCase);
    },

    addPerformanceReview: (review) => {
      return db.prepare(`
        INSERT INTO performance_reviews(id, company_id, employee_id, reviewer_id, review_date, rating, comments, store_id, updated_at, sync_status)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 0)
      `).run(review.id || `perf-${Date.now()}`, review.companyId, review.employeeId, review.reviewerId, review.reviewDate, review.rating || 5, review.comments, review.storeId);
    }
  };
};
