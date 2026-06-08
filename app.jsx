import { useEffect, useMemo, useState } from 'react';
import {
  apiRequest,
  loginUser,
  registerUser,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionVehicles,
  createPromotionVehicle,
  deletePromotionVehicle,
  getCustomerPromotionReport,
  getDashboardSummary
} from './api';
import './App.css';

const emptyVehicle = { plateNumber: '', brand: '', model: '', year: '', vehicleType: '', purchasePrice: '', status: 'Available' };
const emptyCustomer = { firstName: '', lastName: '', email: '', phoneNumber: '', status: 'Active' };
const emptyPromotion = { title: '', description: '', discountType: 'percentage', discountValue: '', startDate: '', endDate: '', status: 'Active' };

function formatMoney(value) {
  return `RWF ${Number(value || 0).toLocaleString()}`;
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : '';
}

function printDocument(title, body) {
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Courier New', monospace; margin: 40px; background: white; color: black; }
          h1 { font-size: 24px; margin-bottom: 4px; border-bottom: 2px solid black; display: inline-block; }
          h2 { font-size: 18px; margin-top: 28px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid black; padding: 10px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .header { text-align: center; margin-bottom: 30px; }
          .footer { margin-top: 50px; text-align: right; border-top: 1px solid black; padding-top: 20px; }
        </style>
      </head>
      <body>${body}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

function App() {
  const savedSession = JSON.parse(localStorage.getItem('swSession') || 'null');
  const [token, setToken] = useState(savedSession?.token || '');
  const [user, setUser] = useState(savedSession?.user || null);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ userName: '', password: '' });
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data states
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [promotionVehicles, setPromotionVehicles] = useState([]);
  const [report, setReport] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  // Form states
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [customerForm, setCustomerForm] = useState(emptyCustomer);
  const [promotionForm, setPromotionForm] = useState(emptyPromotion);
  const [linkForm, setLinkForm] = useState({ promotionId: '', vehicleId: '', performance: 'Scheduled' });

  // Search states
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [promotionSearch, setPromotionSearch] = useState('');

  // Edit states
  const [editingVehicle, setEditingVehicle] = useState('');
  const [editingCustomer, setEditingCustomer] = useState('');
  const [editingPromotion, setEditingPromotion] = useState('');

  const authHeaders = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [vehicleData, customerData, promotionData, linkData, dashboardData] = await Promise.all([
        getVehicles(vehicleSearch),
        getCustomers(customerSearch),
        getPromotions(promotionSearch),
        getPromotionVehicles(),
        getDashboardSummary()
      ]);
      setVehicles(vehicleData);
      setCustomers(customerData);
      setPromotions(promotionData);
      setPromotionVehicles(linkData);
      setDashboard(dashboardData);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const loadReport = async () => {
    if (!token) return;
    try {
      const reportData = await getCustomerPromotionReport();
      setReport(reportData);
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, vehicleSearch, customerSearch, promotionSearch]);

  useEffect(() => {
    if (activeTab === 'reports') {
      loadReport();
    }
  }, [activeTab]);

  const handleAuth = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      if (authMode === 'register') {
        await registerUser(authForm);
        setAuthMode('login');
        setAuthForm({ ...authForm, password: '' });
        setMessage('Registration successful. Please login.');
        return;
      }

      const data = await loginUser(authForm);
      localStorage.setItem('swSession', JSON.stringify(data));
      localStorage.setItem('swToken', data.token);
      setToken(data.token);
      setUser(data.user);
      setMessage(`Welcome ${data.user.userName}`);
    } catch (error) {
      setMessage(error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('swSession');
    localStorage.removeItem('swToken');
    setToken('');
    setUser(null);
    setActiveTab('dashboard');
  };

  // Vehicle CRUD
  const saveVehicle = async (event) => {
    event.preventDefault();
    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle, { ...vehicleForm, year: Number(vehicleForm.year), purchasePrice: Number(vehicleForm.purchasePrice) });
        setMessage('Vehicle updated');
      } else {
        await createVehicle({ ...vehicleForm, year: Number(vehicleForm.year), purchasePrice: Number(vehicleForm.purchasePrice) });
        setMessage('Vehicle added');
      }
      setVehicleForm(emptyVehicle);
      setEditingVehicle('');
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Customer CRUD
  const saveCustomer = async (event) => {
    event.preventDefault();
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer, customerForm);
        setMessage('Customer updated');
      } else {
        await createCustomer(customerForm);
        setMessage('Customer registered');
      }
      setCustomerForm(emptyCustomer);
      setEditingCustomer('');
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Promotion CRUD
  const savePromotion = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...promotionForm,
        discountValue: Number(promotionForm.discountValue),
        startDate: new Date(promotionForm.startDate),
        endDate: new Date(promotionForm.endDate)
      };
      if (editingPromotion) {
        await updatePromotion(editingPromotion, payload);
        setMessage('Promotion updated');
      } else {
        await createPromotion(payload);
        setMessage('Promotion created');
      }
      setPromotionForm(emptyPromotion);
      setEditingPromotion('');
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Promotion-Vehicle Link
  const saveLink = async (event) => {
    event.preventDefault();
    try {
      await createPromotionVehicle(linkForm);
      setLinkForm({ promotionId: '', vehicleId: '', performance: 'Scheduled' });
      setMessage('Vehicle linked to promotion');
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeLink = async (promotionId, vehicleId) => {
    if (!confirm('Remove this vehicle from promotion?')) return;
    try {
      await deletePromotionVehicle(promotionId, vehicleId);
      setMessage('Link removed');
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const removeRecord = async (type, id) => {
    if (!confirm(`Delete this ${type}?`)) return;
    try {
      if (type === 'vehicle') await deleteVehicle(id);
      if (type === 'customer') await deleteCustomer(id);
      if (type === 'promotion') await deletePromotion(id);
      setMessage(`${type} deleted`);
      loadData();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const printReport = () => {
    const rows = report.map(item => `
      <tr>
        <td>${item.customerName}</td>
        <td>${item.vehicleBrand}</td>
        <td>${item.vehicleModel}</td>
        <td>${item.promotionTitle}</td>
        <td>${item.discountValue}</td>
        <td>${item.performance}</td>
      </tr>
    `).join('');

    printDocument(
      'Customer Promotion Report',
      `
        <div class="header">
          <h1>Promotion and Marketing Subsystem</h1>
          <p>Customer & Promotion Report</p>
          <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        <h2>Active Promotions by Vehicle Interest</h2>
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Vehicle Brand</th>
              <th>Vehicle Model</th>
              <th>Promotion Title</th>
              <th>Discount Value</th>
              <th>Performance</th>
            </tr>
          </thead>
          <tbody>${rows || '<tr><td colspan="6">No records available</td></tr>'}</tbody>
        </table>
        <div class="footer">
          <p>Approved by: _________________</p>
          <p>Signature: _________________</p>
        </div>
      `
    );
  };

  if (!token) {
    return (
      <main className="auth-container">
        <section className="auth-card">
          <h1>{authMode === 'register' ? 'Promotion and Marketing Subsystem PMS' : 'Promotion and Marketing Subsystem Login'}</h1>
          <p className="auth-subtitle">{authMode === 'register' ? 'Create staff account' : 'Sign in to continue'}</p>

          <form onSubmit={handleAuth} className="auth-form">
            <label className="auth-label">
              <span>Username</span>
              <input
                className="auth-input"
                value={authForm.userName}
                onChange={(e) => setAuthForm({ ...authForm, userName: e.target.value })}
                required
              />
            </label>

            <label className="auth-label">
              <span>Password</span>
              <input
                type="password"
                className="auth-input"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </label>

            {message && <p className="auth-message">{message}</p>}

            <button className="auth-btn">{authMode === 'register' ? 'Register' : 'Login'}</button>
          </form>

          <p className="auth-switch">
            {authMode === 'register' ? 'Already have an account?' : 'Need an account?'}
            <button onClick={() => { setMessage(''); setAuthMode(authMode === 'register' ? 'login' : 'register'); }}>
              {authMode === 'register' ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Promotion and Marketing Subsystem</h1>
          <p>PMS System</p>
        </div>
        <nav className="sidebar-nav">
          {['dashboard', 'vehicles', 'customers', 'promotions', 'links', 'reports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`nav-item ${activeTab === tab ? 'active' : ''}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </aside>

      <section className="main-content">
        <header className="main-header">
          <div>
            <p className="user-info">Logged in as: {user?.userName} ({user?.role})</p>
            <h2 className="page-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
          </div>
          <button onClick={logout} className="logout-btn">Logout</button>
        </header>

        {message && <div className="message-bar">{message}</div>}

        <div className="content-area">
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && dashboard && (
            <div className="dashboard-grid">
              <div className="stat-card"><span className="stat-label">Vehicles</span><span className="stat-value">{dashboard.summary.vehicles}</span></div>
              <div className="stat-card"><span className="stat-label">Customers</span><span className="stat-value">{dashboard.summary.customers}</span></div>
              <div className="stat-card"><span className="stat-label">Promotions</span><span className="stat-value">{dashboard.summary.promotions}</span></div>
              <div className="stat-card"><span className="stat-label">Active Promos</span><span className="stat-value">{dashboard.summary.activePromotions}</span></div>
              <div className="stat-card"><span className="stat-label">Promo Links</span><span className="stat-value">{dashboard.summary.promotionLinks}</span></div>
            </div>
          )}

          {/* VEHICLES */}
          {activeTab === 'vehicles' && (
            <div className="two-columns">
              <div className="panel">
                <h3>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
                <form onSubmit={saveVehicle} className="form">
                  <input placeholder="Plate Number" value={vehicleForm.plateNumber} onChange={e => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })} required />
                  <input placeholder="Brand" value={vehicleForm.brand} onChange={e => setVehicleForm({ ...vehicleForm, brand: e.target.value })} required />
                  <input placeholder="Model" value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} required />
                  <input type="number" placeholder="Year" value={vehicleForm.year} onChange={e => setVehicleForm({ ...vehicleForm, year: e.target.value })} required />
                  <input placeholder="Vehicle Type" value={vehicleForm.vehicleType} onChange={e => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })} required />
                  <input type="number" placeholder="Purchase Price" value={vehicleForm.purchasePrice} onChange={e => setVehicleForm({ ...vehicleForm, purchasePrice: e.target.value })} required />
                  <select value={vehicleForm.status} onChange={e => setVehicleForm({ ...vehicleForm, status: e.target.value })}>
                    <option value="Available">Available</option>
                    <option value="Rented">Rented</option>
                    <option value="Sold">Sold</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                  <button className="btn-primary">{editingVehicle ? 'Update' : 'Add'}</button>
                  {editingVehicle && <button type="button" className="btn-secondary" onClick={() => { setEditingVehicle(''); setVehicleForm(emptyVehicle); }}>Cancel</button>}
                </form>
              </div>
              <div className="panel">
                <div className="search-bar">
                  <input placeholder="Search vehicles..." value={vehicleSearch} onChange={e => setVehicleSearch(e.target.value)} />
                </div>
                <table className="data-table">
                  <thead><tr><th>Plate</th><th>Brand</th><th>Model</th><th>Year</th><th>Type</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {vehicles.map(v => (
                      <tr key={v._id}>
                        <td>{v.plateNumber}</td><td>{v.brand}</td><td>{v.model}</td><td>{v.year}</td><td>{v.vehicleType}</td><td>{formatMoney(v.purchasePrice)}</td><td>{v.status}</td>
                        <td><button className="action-edit" onClick={() => { setEditingVehicle(v._id); setVehicleForm(v); }}>Edit</button><button className="action-delete" onClick={() => removeRecord('vehicle', v._id)}>Del</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {activeTab === 'customers' && (
            <div className="two-columns">
              <div className="panel">
                <h3>{editingCustomer ? 'Edit Customer' : 'Register Customer'}</h3>
                <form onSubmit={saveCustomer} className="form">
                  <input placeholder="First Name" value={customerForm.firstName} onChange={e => setCustomerForm({ ...customerForm, firstName: e.target.value })} required />
                  <input placeholder="Last Name" value={customerForm.lastName} onChange={e => setCustomerForm({ ...customerForm, lastName: e.target.value })} required />
                  <input type="email" placeholder="Email" value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} required />
                  <input placeholder="Phone Number" value={customerForm.phoneNumber} onChange={e => setCustomerForm({ ...customerForm, phoneNumber: e.target.value })} required />
                  <select value={customerForm.status} onChange={e => setCustomerForm({ ...customerForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                  <button className="btn-primary">{editingCustomer ? 'Update' : 'Register'}</button>
                  {editingCustomer && <button type="button" className="btn-secondary" onClick={() => { setEditingCustomer(''); setCustomerForm(emptyCustomer); }}>Cancel</button>}
                </form>
              </div>
              <div className="panel">
                <div className="search-bar"><input placeholder="Search customers..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} /></div>
                <table className="data-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {customers.map(c => (
                      <tr key={c._id}>
                        <td>{c.firstName} {c.lastName}</td><td>{c.email}</td><td>{c.phoneNumber}</td><td>{c.status}</td>
                        <td><button className="action-edit" onClick={() => { setEditingCustomer(c._id); setCustomerForm(c); }}>Edit</button><button className="action-delete" onClick={() => removeRecord('customer', c._id)}>Del</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROMOTIONS */}
          {activeTab === 'promotions' && (
            <div className="two-columns">
              <div className="panel">
                <h3>{editingPromotion ? 'Edit Promotion' : 'Create Promotion'}</h3>
                <form onSubmit={savePromotion} className="form">
                  <select value={promotionForm.title} onChange={e => setPromotionForm({ ...promotionForm, title: e.target.value })} required>
                    <option value="">Select Title</option>
                    <option value="New Year sale">New Year sale</option>
                    <option value="Holiday Price Slash">Holiday Price Slash</option>
                    <option value="Weekend Flash Sale">Weekend Flash Sale</option>
                    <option value="Clearance Discount Offer">Clearance Discount Offer</option>
                    <option value="Seasonal Price Drop">Seasonal Price Drop</option>
                  </select>
                  <textarea placeholder="Description" value={promotionForm.description} onChange={e => setPromotionForm({ ...promotionForm, description: e.target.value })} required />
                  <select value={promotionForm.discountType} onChange={e => setPromotionForm({ ...promotionForm, discountType: e.target.value })} required>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Amount (RWF)</option>
                    <option value="free">Free</option>
                    <option value="FLAT_RATE">Flat Rate</option>
                    <option value="CASHBACK">Cashback</option>
                    <option value="BUY_ONE_GET_ONE">Buy One Get One</option>
                    <option value="Bundle">Bundle</option>
                  </select>
                  <input type="number" placeholder="Discount Value" value={promotionForm.discountValue} onChange={e => setPromotionForm({ ...promotionForm, discountValue: e.target.value })} required />
                  <input type="date" placeholder="Start Date" value={promotionForm.startDate?.split('T')[0]} onChange={e => setPromotionForm({ ...promotionForm, startDate: e.target.value })} required />
                  <input type="date" placeholder="End Date" value={promotionForm.endDate?.split('T')[0]} onChange={e => setPromotionForm({ ...promotionForm, endDate: e.target.value })} required />
                  <select value={promotionForm.status} onChange={e => setPromotionForm({ ...promotionForm, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button className="btn-primary">{editingPromotion ? 'Update' : 'Create'}</button>
                  {editingPromotion && <button type="button" className="btn-secondary" onClick={() => { setEditingPromotion(''); setPromotionForm(emptyPromotion); }}>Cancel</button>}
                </form>
              </div>
              <div className="panel">
                <div className="search-bar"><input placeholder="Search promotions..." value={promotionSearch} onChange={e => setPromotionSearch(e.target.value)} /></div>
                <table className="data-table">
                  <thead><tr><th>Title</th><th>Type</th><th>Value</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {promotions.map(p => (
                      <tr key={p._id}>
                        <td>{p.title}</td><td>{p.discountType}</td><td>{p.discountType === 'percentage' ? `${p.discountValue}%` : formatMoney(p.discountValue)}</td>
                        <td>{formatDate(p.startDate)}</td><td>{formatDate(p.endDate)}</td><td>{p.status}</td>
                        <td><button className="action-edit" onClick={() => { setEditingPromotion(p._id); setPromotionForm(p); }}>Edit</button><button className="action-delete" onClick={() => removeRecord('promotion', p._id)}>Del</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROMOTION-VEHICLE LINKS */}
          {activeTab === 'links' && (
            <div className="two-columns">
              <div className="panel">
                <h3>Link Vehicle to Promotion</h3>
                <form onSubmit={saveLink} className="form">
                  <select value={linkForm.promotionId} onChange={e => setLinkForm({ ...linkForm, promotionId: e.target.value })} required>
                    <option value="">Select Promotion</option>
                    {promotions.filter(p => p.status === 'Active').map(p => <option key={p._id} value={p._id}>{p.title} ({p.discountType} {p.discountType === 'percentage' ? `${p.discountValue}%` : formatMoney(p.discountValue)})</option>)}
                  </select>
                  <select value={linkForm.vehicleId} onChange={e => setLinkForm({ ...linkForm, vehicleId: e.target.value })} required>
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.brand} {v.model} - {v.plateNumber}</option>)}
                  </select>
                  <select value={linkForm.performance} onChange={e => setLinkForm({ ...linkForm, performance: e.target.value })}>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <button className="btn-primary">Link Vehicle</button>
                </form>
              </div>
              <div className="panel">
                <h3>Current Promotion-Vehicle Links</h3>
                <table className="data-table">
                  <thead><tr><th>Promotion</th><th>Vehicle</th><th>Performance</th><th>Action</th></tr></thead>
                  <tbody>
                    {promotionVehicles.map(link => (
                      <tr key={`${link.promotion?._id}-${link.vehicle?._id}`}>
                        <td>{link.promotion?.title}</td><td>{link.vehicle?.brand} {link.vehicle?.model}</td><td>{link.performance}</td>
                        <td><button className="action-delete" onClick={() => removeLink(link.promotion?._id, link.vehicle?._id)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {activeTab === 'reports' && (
            <div className="report-container">
              <div className="report-header">
                <h3>Customer Promotion Report</h3>
                <button onClick={printReport} className="btn-primary">Print Report</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Vehicle Brand</th>
                    <th>Vehicle Model</th>
                    <th>Promotion Title</th>
                    <th>Discount Value</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.customerName}</td>
                      <td>{item.vehicleBrand}</td>
                      <td>{item.vehicleModel}</td>
                      <td>{item.promotionTitle}</td>
                      <td>{item.discountValue}</td>
                      <td>{item.performance}</td>
                    </tr>
                  ))}
                  {report.length === 0 && (
                    <tr><td colSpan="6" style={{ textAlign: 'center' }}>No promotions available for customers</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
