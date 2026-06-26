import sqlite3
import os
import json
from flask import Flask, jsonify, request, g, session
from flask_cors import CORS

app = Flask(__name__, static_folder='..', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'autoshop-dev-secret-key-2024')
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), 'autoshop.db')
CONFIG_DIR = os.path.join(os.path.dirname(__file__), 'config')

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def load_config(filename):
    path = os.path.join(CONFIG_DIR, filename)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    c = db.cursor()
    c.executescript('''
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE
        );
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            category_id INTEGER,
            price REAL NOT NULL,
            original_price REAL,
            description TEXT,
            short_desc TEXT,
            features TEXT,
            specs TEXT,
            image_url TEXT,
            badge TEXT,
            in_stock INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        );
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            phone TEXT,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            customer_phone TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            items TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            payment_method TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            city TEXT,
            enquiry_type TEXT,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS saved_vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            year TEXT NOT NULL,
            nickname TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS services_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            customer_name TEXT NOT NULL,
            customer_email TEXT,
            customer_phone TEXT,
            vehicle_brand TEXT,
            vehicle_model TEXT,
            vehicle_year TEXT,
            service_id TEXT NOT NULL,
            service_variant TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    ''')
    try:
        db.execute('ALTER TABLE contact_messages ADD COLUMN city TEXT')
    except:
        pass
    try:
        db.execute('ALTER TABLE contact_messages ADD COLUMN enquiry_type TEXT')
    except:
        pass
    c.execute("SELECT COUNT(*) FROM users WHERE email = 'admin@autoshop.in'")
    if c.fetchone()[0] == 0:
        import hashlib
        c.execute("INSERT INTO users (name, email, password, phone, is_admin) VALUES (?,?,?,?,1)",
                  ['Admin', 'admin@autoshop.in', hashlib.sha256('admin123'.encode()).hexdigest(), '9999999999'])
    db.commit()
    db.close()

def seed_data():
    db = sqlite3.connect(DB_PATH)
    c = db.cursor()
    existing = c.execute('SELECT COUNT(*) FROM products').fetchone()[0]
    if existing > 0:
        db.close()
        return
    cats = ['Tech & Safety', 'Interior Comfort', 'Exterior Style', 'Maintenance', 'Performance']
    slugs = ['tech-safety', 'interior-comfort', 'exterior-style', 'maintenance', 'performance']
    for i, (name, slug) in enumerate(zip(cats, slugs), 1):
        c.execute("INSERT OR IGNORE INTO categories (id, name, slug) VALUES (?,?,?)", (i, name, slug))
    products = [
        ('Pro-Guard 4K Dashcam', 'pro-guard-4k-dashcam', 1, 14999, None, 'Dual-channel 4K dashcam with Sony Starvis sensor for crystal clear footage day and night.', 'Dual Channel • Sony Starvis Sensor', '4K Recording|Dual Channel|Sony Starvis Sensor|Parking Mode|WiFi Connectivity', '{"Sensor":"Sony Starvis","Resolution":"4K @ 30fps","Field of View":"150°","Storage":"Up to 256GB"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDR4H4vDmZej6G15ImqHIdlPgdWZx63ga3eUXJ_k13fFACUM0lgOQlwg0KE9FuvUPFitpDesOaKslk6A6Ebe4hNkmwnWarRhfyRKsgbgceliWuGN-4TBEtGaZTNMUSQ8ruPVG0tzGH6HLp4Wap8b-AE3MACJ1uoYBxsV-OD275dM6gS8mOf9ZUYvqwXfe3AXEI3jakcGLKorzPV4zXp0S7q_0ZAXFAUWkN0tYdwT6Jqg5s5cW96veStV2pHbSQ-O_L5bwdSuUzPalmO', 'Must Have'),
        ('Custom Nappa Covers', 'custom-nappa-covers', 2, 28500, None, 'Premium Nappa leather seat covers with diamond quilting. Custom fit for Mahindra and Tata vehicles.', 'Mahindra/Tata Custom Fit • Tan', 'Premium Nappa Leather|Diamond Quilting|Custom Fit|Breathable|Easy Installation', '{"Material":"Nappa Leather","Fit":"Custom","Colors":"Tan, Black, Burgundy","Warranty":"3 Years"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDu30oSefAzkgQN-SDdDyNlJw5bxasFbhviLJKx7EK9nw-_mgQjFw8FFqBUdx0tLojvRu_d1-j-T_Y29TXggyEnv6vIeXCke0CoDmV4qjYomKL_1DFCkCk0batx9LxvQFZ-fZVGiXfkuikzuROEMdJFq7YIIJoDpOEyJElnyaVh89c4qabafI2_edngm_FWX7ZSUhiY8ghcOD8-lHWWfzucKWQV8FATQz29I5eobOlYqWbGnjnaSiP4r7TRLFA_u-GRnClqE_RHjro4', None),
        ('LumiFlow RGB Kit', 'lumiflow-rgb-kit', 2, 8999, None, '64-color RGB ambient lighting kit with app control. Stealth installation for a premium factory look.', '64 Color • App Controlled • Stealth', '64 Colors|App Controlled|Music Sync|Stealth Install|Smartphone Integration', '{"LEDs":"64 Colors RGB","Control":"Smartphone App","Power":"OBD / 12V","Warranty":"2 Years"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGCwwhykNS7c0Qcx7c81ws-dhaFRDJh20CAP7TgQaS5ivNOO7SxhK3cmJ473_1Yw0nDyrZxcxemjAfRl3aeB-SyVQBaGWecsEA-1Q9AMol3bg8Ml-piud24J1QgkVAHXu8ipSin1EWk5x2J9iMQkPMFH29TgfHzQwZDP_2t31-4kUTcrjF8uTR91bRKPpnEfcbMToIPct-WjwXbM2IKHyhKzFHeBL4EFGvEn1H8jx-Yy7PV25x3adYQvpCW40eAAK-OvxKilj0Mpnd', 'App Controlled'),
        ('7D Carbon Floor Mats', '7d-carbon-floor-mats', 2, 6450, None, 'Custom-fit 7D carbon fiber textured floor mats with waterproof dust-trap technology.', 'Waterproof • Dust-Trap Technology', '7D Carbon Fiber|Waterproof|Dust-Trap|Custom Fit|Easy Clean', '{"Material":"Carbon Fiber PVC","Layers":"7D","Coverage":"Full Set","Warranty":"2 Years"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPLXUYUmZZb8Rk3wYZ-PRrL3Kdm78mUj8XVbzVx1m8AnYxqovF_7iRxH7g_VH5CtBG8dIlglaeIMonwFe0g7UcIMmk0mOAAlsBLveMmpLZmj-legt9GX5f7M56trq6u4oZaNlKzFcVibswDM4CEHOrkyNzSn1mNJBBGm2njifvFVAl9YUEKMvtpQRZHQaabtsihQDA0kBRAvcy5WR0_Qxnwo7kw-zohyLRKLtnhubSdeIcQBS-B6_lHHRZXEEN4-jdHIh8tsT0Fmd4', None),
        ('SmartView 10" Console', 'smartview-10-console', 1, 22800, None, 'Large 10-inch Android touchscreen infotainment system with wireless CarPlay and Android Auto.', 'Wireless CarPlay • Android Auto', '10" HD Display|Wireless CarPlay|Android Auto|GPS Navigation|Bluetooth', '{"Screen":"10.1 inches","OS":"Android","Resolution":"1280x720","Connectivity":"WiFi, BT 5.0, GPS"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6v_BuuEKI-zEaeGOL96zle4AzZmW-0bdl37I3_42-SplT2pT9ezJs7uKpGCq86GGl5wjCcqf3SANyNBAJWEO2B7XSe5hntnJYd6eQi1Enn8Z3NhsoMQSyo_dzBgZDKN6HddOPAiY5dE2gh06Mx9SGk_wgu3pXWgWZBQul54cOrpqKVgWaC3fGlpywQklkWqeZlk6qOYLrHqzqdgJxVYaj9zaYOySWH1T205XOFSZAJdlXBKXTqDolBYcTEkGxAl4DYTEapZGS8cIl', None),
        ('Diamond Cut Alloys', 'diamond-cut-alloys', 3, 42000, None, 'Set of 4 dual-tone diamond cut alloy wheels for Kia/Hyundai vehicles.', '17-inch Set • Kia/Hyundai Fit', 'Diamond Cut Finish|Dual Tone|Lightweight|TUV Certified|Set of 4', '{"Size":"17 inch","Finish":"Diamond Cut","PCD":"5x114.3","Offset":"45mm","Weight":"9.8kg each"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUccBy5z50Tg7Ld1fuozlJ-zfriuMFKP4u159YzWfpJgmIrODMyUgBGiIhaaoM1zxc0wZyyrsJGYveYtMNfphRHhNacc9P3z-ONbOoyqqPXXWYs5Kgao2sHJNez4aQ1N3RTNiF7FtDKIcEEBxli3O6dZLi-q_MtjB_EzcmCRLdofqfrXQSAIqiVr9Kx74koKV9zESHGdmp7ZadSq57aws1y5WLkBcFlhj5FOe_DlxEjII3Y_3peCMT-Ew1fHrhmXoIb2aqtASu0eMq', 'Best Seller'),
        ('Swift-Fill Digital Pump', 'swift-fill-digital-pump', 4, 3250, None, 'Portable digital tyre inflator with auto-shutoff and high-flow pump.', 'Portable • Auto-Shutoff • High-Flow', 'Digital Display|Auto Shutoff|High Flow|LED Light|12V Powered', '{"Max Pressure":"150 PSI","Flow Rate":"35 L/min","Power":"12V DC","Hose Length":"50cm"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2MdSOCp9fGOm1poOId7IASMMIR95BNSwKaHTMJYCrcCm5Rx6aSDZQmLAPPNYKRJljG6U_6z6lInI40hVMT083L-UgIOJrgjXhcqwTyEDbC4idZHhssjKQdsNB2_lCPGVZdjY0eOhHVmzGSJfl6ToPG39aE-yzMr3CizIwVv3nOBiQtHJkgTZbmtU_Rz_eKo5tbJdBTWYtjHp2Du3ddVzuLS_xvQ5YnCpVNtfMtIQC9aG5cR2mBYd7v-w49M2PCiK42FBaS1N0ERYg', None),
        ('Magnetic Heat Shields', 'magnetic-heat-shields', 2, 1850, None, 'Custom-fit magnetic sunshades for side windows. Blocks heat while maintaining visibility.', 'Custom Fit • UV Protection • Set of 4', 'Magnetic Mount|UV Protection|Custom Fit|Set of 4|See-Through Mesh', '{"Material":"Premium Mesh","Mount":"Magnetic","Coverage":"Side Windows","UV Block":"99%"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuD7tcfT9faLBIqqxAK9zX5EGjlY4tCY53M_x1PXRJBupCbMCACG3ZI4A_6wqxROAg8XKJkOZ92NZOFU0ZApl-7sACi4MelyLxjKyhk_BFrccEM4R-GxaMYv7XoutqVHfkkhh3NnL242aTbkWeq_YjMR-G9H0SkVnOgAVc9n_QqETmB8k-KwXk05Ah7ZUXza1brTD7or4Wfp4PKh4Q9lBHj9SlyeLakTXuvLs0fiaSXasaZ60lsphoiZN1Zru6vOozNwwD6TUxDr5CPh', None),
        ('Quantum-V Core Brake System', 'quantum-v-core-brake-system', 5, 238500, 280000, 'High-performance carbon-ceramic brake system with 6-piston monoblock calipers.', 'Carbon-Ceramic • 6-Piston • 850°C Rating', 'Carbon-Ceramic Rotors|6-Piston Monoblock|850°C Rating|PVD Coated|Monsoon Grade', '{"Rotor":"Carbon-Ceramic Matrix","Pistons":"6-Piston Opposed","Max Temp":"850°C","Coating":"PVD Ion-Plated","Weight":"-12kg vs OEM"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQEtrl4JUtPUIW254-G4lZn84jyQgvhKUeI20dBzfSviqVfWz6fvdT3Qrw9stQh6b-MP9oqBzZGEl4bw4ZK0-g2pgk-iot3vXiCz3V84WKseD-DzRsJzOhhKL3Yalojk_AlpdjRnfc6WnKhJ9KmDgOrtGjQxGosSwH5ehJLMLaunKDgOAkZRdyhjhprr7VwoOfa_qms0kq_S4buzaC_8P9MLeuT3hgLEqD3wIA3kSTrAnb8b67H-GtjnSwvqqX0QYvZ72Na7xpQIoU', 'Performance Core'),
        ('Titanium Exhaust Gen-3', 'titanium-exhaust-gen-3', 5, 356999, None, 'Grade 5 titanium exhaust system with satin grey finish.', 'Grade 5 Titanium • Satin Grey', 'Grade 5 Titanium|Satin Grey Finish|Weight Reduction|Deep Note|Bolt-On Installation', '{"Material":"Grade 5 Titanium","Finish":"Satin Grey","Weight":"8.2kg","Fitment":"Direct Bolt-On"}', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBRL2xuasf3gchOfh6EAR9EEc-TsknudXL0ffe8o4oteHty2SneHx0GygAg0ECQkvDAxBUMKJyhFrcKHLpfGSRGHyu9QsKhmZjaOEXqmlJ-cd0RF4ktcXDFsGX0xBGOvXTOEVSmsR5EhRG0zHmNvMPRROsOPZsoAp7kOJcUFr5LHAzjtAtiZ16q66bTDJ0yv0SZMXPuRB_pr5BvD9CeMuDNDM2mA2IS5emrr_1BUHyLFBhg82msSEJsyfntDwUo1Zl1ZxRGvt3Zs4j1', 'Premium'),
    ]
    c.executemany('INSERT OR IGNORE INTO products (name,slug,category_id,price,original_price,description,short_desc,features,specs,image_url,badge) VALUES (?,?,?,?,?,?,?,?,?,?,?)', products)
    db.commit()
    db.close()

# ---------- AUTH ----------

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    import hashlib
    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE email = ?', [data['email']]).fetchone()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409
    c = db.execute('INSERT INTO users (name, email, password, phone) VALUES (?,?,?,?)',
                   [data.get('name', ''), data['email'], hashlib.sha256(data['password'].encode()).hexdigest(), data.get('phone', '')])
    db.commit()
    session['user_id'] = c.lastrowid
    session['user_name'] = data.get('name', '')
    session['user_email'] = data['email']
    return jsonify({'id': c.lastrowid, 'name': data.get('name', ''), 'email': data['email'], 'message': 'Account created!'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password required'}), 400
    import hashlib
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE email = ?', [data['email']]).fetchone()
    if not user or user['password'] != hashlib.sha256(data['password'].encode()).hexdigest():
        return jsonify({'error': 'Invalid email or password'}), 401
    session['user_id'] = user['id']
    session['user_name'] = user['name']
    session['user_email'] = user['email']
    session['is_admin'] = user['is_admin']
    return jsonify({'id': user['id'], 'name': user['name'], 'email': user['email'], 'is_admin': user['is_admin']})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'})

@app.route('/api/auth/me')
def me():
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 200
    return jsonify({'authenticated': True, 'id': session['user_id'], 'name': session.get('user_name'), 'email': session.get('user_email'), 'is_admin': session.get('is_admin', 0)})

# ---------- CONFIG ----------

@app.route('/api/config/brands')
def get_brands():
    return jsonify(load_config('brands.json'))

@app.route('/api/config/services')
def get_services():
    return jsonify(load_config('services.json'))

@app.route('/api/config/brands', methods=['POST'])
def save_brands():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    path = os.path.join(CONFIG_DIR, 'brands.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return jsonify({'message': 'Brands updated!'})

@app.route('/api/config/services', methods=['POST'])
def save_services():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    path = os.path.join(CONFIG_DIR, 'services.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return jsonify({'message': 'Services updated!'})

# ---------- PRODUCTS ----------

@app.route('/api/categories')
def get_categories():
    db = get_db()
    cats = db.execute('SELECT * FROM categories ORDER BY name').fetchall()
    return jsonify([dict(c) for c in cats])

@app.route('/api/products')
def get_products():
    db = get_db()
    category = request.args.get('category')
    search = request.args.get('search')
    query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1'
    params = []
    if category:
        query += ' AND c.slug = ?'
        params.append(category)
    if search:
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)'
        params.extend([f'%{search}%', f'%{search}%'])
    query += ' ORDER BY p.created_at DESC'
    products = db.execute(query, params).fetchall()
    result = []
    for p in products:
        d = dict(p)
        if d.get('specs'): d['specs'] = json.loads(d['specs'])
        if d.get('features'): d['features'] = d['features'].split('|')
        result.append(d)
    return jsonify(result)

@app.route('/api/products', methods=['POST'])
def create_product():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    db = get_db()
    c = db.execute('''
        INSERT INTO products (name, slug, category_id, price, original_price, description, short_desc, features, specs, image_url, badge)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ''', [data['name'], data.get('slug', data['name'].lower().replace(' ', '-')), data.get('category_id'), data['price'], data.get('original_price'), data.get('description'), data.get('short_desc'), data.get('features'), data.get('specs'), data.get('image_url'), data.get('badge')])
    db.commit()
    return jsonify({'id': c.lastrowid, 'message': 'Product created!'}), 201

@app.route('/api/products/<slug>')
def get_product(slug):
    db = get_db()
    p = db.execute('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?', [slug]).fetchone()
    if not p:
        try:
            pid = int(slug)
            p = db.execute('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?', [pid]).fetchone()
        except ValueError:
            return jsonify({'error': 'Product not found'}), 404
    if not p:
        return jsonify({'error': 'Product not found'}), 404
    d = dict(p)
    if d.get('specs'): d['specs'] = json.loads(d['specs'])
    if d.get('features'): d['features'] = d['features'].split('|')
    return jsonify(d)

@app.route('/api/products/<slug>', methods=['PUT'])
def update_product(slug):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    db = get_db()
    db.execute('''
        UPDATE products SET name=?, price=?, original_price=?, description=?, short_desc=?, features=?, specs=?, image_url=?, badge=?, category_id=?
        WHERE slug=?
    ''', [data.get('name'), data.get('price'), data.get('original_price'), data.get('description'), data.get('short_desc'), data.get('features'), data.get('specs'), data.get('image_url'), data.get('badge'), data.get('category_id'), slug])
    db.commit()
    return jsonify({'message': 'Product updated!'})

@app.route('/api/products/<slug>', methods=['DELETE'])
def delete_product(slug):
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    db = get_db()
    db.execute('DELETE FROM products WHERE slug = ?', [slug])
    db.commit()
    return jsonify({'message': 'Product deleted!'})

# ---------- ORDERS ----------

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    if not data or not data.get('items'):
        return jsonify({'error': 'No items in order'}), 400
    db = get_db()
    c = db.execute('''
        INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, address, city, state, pincode, items, total, payment_method)
        VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ''', [session.get('user_id'), data.get('name'), data.get('email'), data.get('phone'), data.get('address'), data.get('city'), data.get('state'), data.get('pincode'), json.dumps(data['items']), data.get('total', 0), data.get('payment_method', 'UPI')])
    db.commit()
    return jsonify({'id': c.lastrowid, 'status': 'pending', 'message': 'Order placed successfully!'}), 201

@app.route('/api/orders')
def get_orders():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    db = get_db()
    orders = db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [session['user_id']]).fetchall()
    result = []
    for o in orders:
        d = dict(o)
        d['items'] = json.loads(d['items'])
        result.append(d)
    return jsonify(result)

@app.route('/api/orders/<int:oid>')
def get_order(oid):
    db = get_db()
    o = db.execute('SELECT * FROM orders WHERE id = ?', [oid]).fetchone()
    if not o:
        return jsonify({'error': 'Order not found'}), 404
    d = dict(o)
    d['items'] = json.loads(d['items'])
    return jsonify(d)

# ---------- CONTACT ----------

@app.route('/api/contact', methods=['POST'])
def submit_contact():
    data = request.get_json()
    if not data or not data.get('name') or not data.get('message'):
        return jsonify({'error': 'Name and message required'}), 400
    db = get_db()
    c = db.execute('INSERT INTO contact_messages (name, email, phone, city, enquiry_type, message) VALUES (?,?,?,?,?,?)',
                   [data['name'], data.get('email'), data.get('phone'), data.get('city'), data.get('enquiry_type'), data['message']])
    db.commit()
    return jsonify({'id': c.lastrowid, 'message': 'Message received! We will get back to you soon.'}), 201

# ---------- SAVED VEHICLES ----------

@app.route('/api/vehicles', methods=['GET'])
def get_vehicles():
    if 'user_id' not in session:
        return jsonify([])
    db = get_db()
    vehicles = db.execute('SELECT * FROM saved_vehicles WHERE user_id = ? ORDER BY created_at DESC', [session['user_id']]).fetchall()
    return jsonify([dict(v) for v in vehicles])

@app.route('/api/vehicles', methods=['POST'])
def save_vehicle():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    data = request.get_json()
    db = get_db()
    c = db.execute('INSERT INTO saved_vehicles (user_id, brand, model, year, nickname) VALUES (?,?,?,?,?)',
                   [session['user_id'], data['brand'], data['model'], data['year'], data.get('nickname', '')])
    db.commit()
    return jsonify({'id': c.lastrowid, 'message': 'Vehicle saved!'}), 201

@app.route('/api/vehicles/<int:vid>', methods=['DELETE'])
def delete_vehicle(vid):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    db = get_db()
    db.execute('DELETE FROM saved_vehicles WHERE id = ? AND user_id = ?', [vid, session['user_id']])
    db.commit()
    return jsonify({'message': 'Vehicle removed!'})

# ---------- SERVICE REQUESTS ----------

@app.route('/api/service-requests', methods=['POST'])
def create_service_request():
    data = request.get_json()
    if not data or not data.get('service_id'):
        return jsonify({'error': 'Service ID required'}), 400
    db = get_db()
    c = db.execute('''
        INSERT INTO services_requests (user_id, customer_name, customer_email, customer_phone, vehicle_brand, vehicle_model, vehicle_year, service_id, service_variant, message)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    ''', [session.get('user_id'), data.get('name'), data.get('email'), data.get('phone'), data.get('vehicle_brand'), data.get('vehicle_model'), data.get('vehicle_year'), data['service_id'], data.get('service_variant'), data.get('message')])
    db.commit()
    return jsonify({'id': c.lastrowid, 'message': 'Service request submitted!'}), 201

@app.route('/api/service-requests')
def get_service_requests():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    db = get_db()
    reqs = db.execute('SELECT * FROM services_requests WHERE user_id = ? ORDER BY created_at DESC', [session['user_id']]).fetchall()
    return jsonify([dict(r) for r in reqs])

# ---------- ADMIN ----------

@app.route('/api/admin/contact-messages')
def admin_contact_messages():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    db = get_db()
    msgs = db.execute('SELECT * FROM contact_messages ORDER BY created_at DESC').fetchall()
    return jsonify([dict(m) for m in msgs])

@app.route('/api/admin/orders')
def admin_orders():
    if not session.get('is_admin'):
        return jsonify({'error': 'Unauthorized'}), 403
    db = get_db()
    orders = db.execute('SELECT * FROM orders ORDER BY created_at DESC').fetchall()
    result = []
    for o in orders:
        d = dict(o)
        d['items'] = json.loads(d['items'])
        result.append(d)
    return jsonify(result)

@app.route('/api/admin/seed', methods=['POST'])
def seed():
    init_db()
    seed_data()
    return jsonify({'message': 'Database seeded!'})

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def static_files(path):
    return app.send_static_file(path)

if __name__ == '__main__':
    init_db()
    seed_data()
    app.run(host='0.0.0.0', port=5000, debug=True)
