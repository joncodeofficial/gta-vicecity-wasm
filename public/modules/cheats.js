
(function() {
    // Touch device detection
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isTouch = isMobile && window.matchMedia('(pointer: coarse)').matches;
    
    const style = document.createElement('style');
    style.textContent = `
        #cheat-engine-ui {
            position: fixed;
            top: 0;
            right: 0;
            width: ${isTouch ? '100vw' : '340px'};
            height: 100vh;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(15px);
            color: #eee;
            font-family: 'Consolas', 'Monaco', monospace;
            padding: ${isTouch ? '15px 15px 150px 15px' : '20px 20px 100px 20px'};
            z-index: 10000;
            display: none;
            flex-direction: column;
            gap: ${isTouch ? '12px' : '15px'};
            overflow-y: auto;
            user-select: none;
            border-left: ${isTouch ? 'none' : '2px solid #ff00ff'};
            box-shadow: -10px 0 30px rgba(0,0,0,0.8);
            box-sizing: border-box;
        }
        
        /* Touch toggle button */
        #cheat-toggle-btn {
            display: ${isTouch ? 'flex' : 'none'};
            position: fixed;
            top: 10px;
            right: 10px;
            width: 50px;
            height: 50px;
            background: rgba(255, 0, 255, 0.3);
            border: 2px solid #ff00ff;
            border-radius: 50%;
            color: #ff00ff;
            font-size: 20px;
            font-weight: bold;
            z-index: 9999;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            backdrop-filter: blur(5px);
            touch-action: manipulation;
        }
        #cheat-toggle-btn:active {
            background: rgba(255, 0, 255, 0.6);
            transform: scale(0.95);
        }
        #cheat-toggle-btn.active {
            background: rgba(255, 0, 255, 0.6);
        }
        
        /* Airbreak touch controls */
        #airbreak-touch-controls {
            display: none;
            position: fixed;
            bottom: 20px;
            left: 20px;
            z-index: 10001;
            touch-action: none;
        }
        #airbreak-touch-controls.active {
            display: block;
        }
        .airbreak-joystick {
            width: 120px;
            height: 120px;
            background: rgba(0, 255, 255, 0.2);
            border: 2px solid #0ff;
            border-radius: 50%;
            position: relative;
            touch-action: none;
        }
        .airbreak-joystick-knob {
            width: 50px;
            height: 50px;
            background: rgba(0, 255, 255, 0.6);
            border: 2px solid #0ff;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
        .airbreak-vertical-btns {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            z-index: 10001;
        }
        .airbreak-v-btn {
            width: 60px;
            height: 60px;
            background: rgba(0, 255, 255, 0.2);
            border: 2px solid #0ff;
            border-radius: 10px;
            color: #0ff;
            font-size: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: manipulation;
        }
        .airbreak-v-btn:active {
            background: rgba(0, 255, 255, 0.5);
        }
        #airbreak-toggle-fly {
            position: fixed;
            bottom: 160px;
            right: 20px;
            width: 80px;
            height: 40px;
            background: rgba(255, 255, 0, 0.2);
            border: 2px solid #ff0;
            border-radius: 10px;
            color: #ff0;
            font-size: 12px;
            font-weight: bold;
            z-index: 10001;
            display: none;
            align-items: center;
            justify-content: center;
            touch-action: manipulation;
        }
        #airbreak-toggle-fly.active {
            background: rgba(255, 255, 0, 0.5);
        }
        #airbreak-toggle-fly.visible {
            display: flex;
        }
        #cheat-engine-ui h1 {
            font-size: 18px;
            text-align: left;
            margin: 0 0 10px 0;
            color: #ff00ff;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
        }
        .ce-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .ce-label {
            font-size: 10px;
            color: #888;
            text-transform: uppercase;
        }
        #cheat-engine-ui input, #cheat-engine-ui select, #cheat-engine-ui button {
            background: rgba(255, 255, 255, 0.05);
            color: #fff;
            border: 1px solid #333;
            padding: 6px 10px;
            font-size: 12px;
            outline: none;
        }
        #cheat-engine-ui input:focus {
            border-color: #ff00ff;
        }
        #cheat-engine-ui button {
            cursor: pointer;
            transition: all 0.1s;
            text-transform: uppercase;
            font-size: ${isTouch ? '12px' : '10px'};
            min-height: ${isTouch ? '44px' : 'auto'};
            touch-action: manipulation;
        }
        #cheat-engine-ui button:hover, #cheat-engine-ui button:active {
            background: #ff00ff;
            color: #000;
            border-color: #ff00ff;
        }
        #cheat-engine-ui .results {
            max-height: ${isTouch ? '150px' : '120px'};
            overflow-y: auto;
            background: rgba(0,0,0,0.3);
            border: 1px solid #222;
        }
        .cheat-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isTouch ? '8px' : '4px'};
        }
        .cheat-cat {
            font-size: ${isTouch ? '13px' : '11px'};
            color: #0ff;
            margin-top: ${isTouch ? '15px' : '10px'};
            text-transform: uppercase;
        }
        .cheat-btn {
            background: transparent !important;
            border: 1px solid #444 !important;
            text-align: left;
            padding: ${isTouch ? '12px 10px' : '6px 10px'};
        }
        .cheat-btn:hover, .cheat-btn:active {
            border-color: #0ff !important;
            color: #0ff !important;
            background: rgba(0, 255, 255, 0.1) !important;
        }
        
        /* Close button for touch */
        #cheat-close-btn {
            display: ${isTouch ? 'flex' : 'none'};
            position: absolute;
            top: 15px;
            right: 15px;
            width: 40px;
            height: 40px;
            background: rgba(255, 0, 0, 0.3);
            border: 2px solid #f00;
            border-radius: 50%;
            color: #f00;
            font-size: 20px;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            touch-action: manipulation;
        }
        #cheat-close-btn:active {
            background: rgba(255, 0, 0, 0.6);
        }
        ::-webkit-scrollbar {
            width: 4px;
        }
        ::-webkit-scrollbar-thumb {
            background: #333;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #ff00ff;
        }

        /* Toggle Switch */
        .switch-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.05);
            padding: 8px 10px;
            border: 1px solid #333;
            margin-bottom: 4px;
        }
        .switch-label {
            font-size: 12px;
            color: #fff;
            text-transform: uppercase;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 34px;
            height: 18px;
        }
        .switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #333;
            transition: .4s;
            border-radius: 18px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 12px;
            width: 12px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #ff00ff;
        }
        input:checked + .slider:before {
            transform: translateX(16px);
        }
        
        /* Money Button */
        .money-btn {
            width: 100%;
            background: rgba(255, 215, 0, 0.1) !important;
            border: 1px solid #ffd700 !important;
            color: #ffd700 !important;
            font-weight: bold;
            margin-top: 4px;
        }
        .money-btn:active {
            background: rgba(255, 215, 0, 0.3) !important;
        }
    `;
    document.head.appendChild(style);

    // Create touch toggle button
    const toggleBtn = document.createElement('div');
    toggleBtn.id = 'cheat-toggle-btn';
    toggleBtn.innerHTML = '⚙';
    toggleBtn.title = 'Open Cheat Menu';
    document.body.appendChild(toggleBtn);

    // Create airbreak touch controls
    const airbreakTouchControls = document.createElement('div');
    airbreakTouchControls.id = 'airbreak-touch-controls';
    airbreakTouchControls.innerHTML = `
        <div class="airbreak-joystick" id="airbreak-joystick">
            <div class="airbreak-joystick-knob" id="airbreak-joystick-knob"></div>
        </div>
    `;
    document.body.appendChild(airbreakTouchControls);

    // Create vertical buttons for airbreak (up/down)
    const airbreakVerticalBtns = document.createElement('div');
    airbreakVerticalBtns.className = 'airbreak-vertical-btns';
    airbreakVerticalBtns.id = 'airbreak-vertical-btns';
    airbreakVerticalBtns.innerHTML = `
        <div class="airbreak-v-btn" id="airbreak-up-btn">↑</div>
        <div class="airbreak-v-btn" id="airbreak-down-btn">↓</div>
    `;
    airbreakVerticalBtns.style.display = 'none';
    document.body.appendChild(airbreakVerticalBtns);

    // Create fly toggle button for touch
    const flyToggleBtn = document.createElement('div');
    flyToggleBtn.id = 'airbreak-toggle-fly';
    flyToggleBtn.innerHTML = 'FLY';
    document.body.appendChild(flyToggleBtn);

    const ui = document.createElement('div');
    ui.id = 'cheat-engine-ui';
    ui.innerHTML = `
        <div id="cheat-close-btn">✕</div>
        <h1>Cheat Engine</h1>
        
        <div class="ce-section">
            <div class="ce-label">Scanner</div>
            <div style="display: flex; gap: 4px;">
                <input type="text" id="ce-value" placeholder="Value" style="flex: 1;">
                <select id="ce-type">
                    <option value="any">Any</option>
                    <option value="i32">i32</option>
                    <option value="f32">f32</option>
                    <option value="i16">i16</option>
                    <option value="i8">i8</option>
                </select>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
                <button id="ce-search">New</button>
                <button id="ce-next">Next</button>
                <button id="ce-reset">Reset</button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px;">
                <button id="ce-snap" title="Capture current values">Snap</button>
                <button id="ce-inc" title="Find increased values">Inc</button>
                <button id="ce-dec" title="Find decreased values">Dec</button>
                <button id="ce-changed" title="Find changed values">Chg</button>
            </div>
            <div id="ce-status" style="font-size: 10px; color: #888;">Ready</div>
            <div class="results" id="ce-results"></div>
        </div>

        <div class="ce-section">
            <div class="ce-label">Manual</div>
            <div style="display: flex; gap: 4px;">
                <input type="text" id="ce-manual-addr" placeholder="0xAddress" style="flex: 1;">
                <button id="ce-view-addr">View</button>
            </div>
            <div id="ce-manual-results" style="font-size: 10px; display: none;"></div>
        </div>

        <div class="ce-section">
            <div class="ce-label">Quick Actions</div>
            
            <div class="switch-container">
                <span class="switch-label">AirBreak (RShift)</span>
                <label class="switch">
                    <input type="checkbox" id="ce-toggle-airbreak">
                    <span class="slider"></span>
                </label>
            </div>
            
            <div class="switch-container">
                <span class="switch-label">GodMode (Inf HP)</span>
                <label class="switch">
                    <input type="checkbox" id="ce-toggle-godmode">
                    <span class="slider"></span>
                </label>
            </div>

            <button id="ce-add-money" class="money-btn">+$9999999 MONEY</button>
            
            <div style="display: flex; gap: 4px; margin-top: 4px; align-items: center;">
                <span style="font-size: 10px; color: #888;">Fly Speed:</span>
                <input type="number" id="ce-fly-speed" value="2.0" step="0.5" min="0.1" max="50" style="width: 60px;">
            </div>
            <div id="ce-airbreak-status" style="font-size: 10px; color: #888;">Ready</div>
            <div id="ce-pos-display" style="font-size: 9px; color: #666;"></div>
        </div>

        <div class="ce-section">
            <div class="ce-label">Cheats</div>
            
            <div class="cheat-cat">Weapons & Health</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('THUGSTOOLS')">Thug Tools</button>
                <button class="cheat-btn" onclick="typeCheat('PROFESSIONALTOOLS')">Pro Tools</button>
                <button class="cheat-btn" onclick="typeCheat('NUTTERTOOLS')">Nutter Tools</button>
                <button class="cheat-btn" onclick="typeCheat('ASPIRINE')">Health</button>
                <button class="cheat-btn" onclick="typeCheat('PRECIOUSPROTECTION')">Armor</button>
            </div>

            <div class="cheat-cat">Gameplay</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('LEAVEMEALONE')">No Wanted</button>
                <button class="cheat-btn" onclick="typeCheat('YOUWONTTAKEMEALIVE')">Wanted +2</button>
                <button class="cheat-btn" onclick="typeCheat('ONSPEED')">Fast Game</button>
                <button class="cheat-btn" onclick="typeCheat('BOOOOOORING')">Slow Game</button>
                <button class="cheat-btn" onclick="typeCheat('LIFEISPASSINGMEBY')">Fast Time</button>
                <button class="cheat-btn" onclick="typeCheat('BIGBANG')">Explode All</button>
                <button class="cheat-btn" onclick="typeCheat('FIGHTFIGHTFIGHT')">Peds Riot</button>
                <button class="cheat-btn" onclick="typeCheat('NOBODYLIKESME')">Peds Attack</button>
                <button class="cheat-btn" onclick="typeCheat('OURGODGIVENRIGHTTOBEARARMS')">Peds Armed</button>
                <button class="cheat-btn" onclick="typeCheat('CHICKSWITHGUNS')">Armed Girls</button>
                <button class="cheat-btn" onclick="typeCheat('FANNYMAGNET')">Ladies Man</button>
                <button class="cheat-btn" onclick="typeCheat('HOPINGIRL')">Get in Car</button>
                <button class="cheat-btn" onclick="typeCheat('GREENLIGHT')">Green Lights</button>
                <button class="cheat-btn" onclick="typeCheat('MIAMITRAFFIC')">Fast Traffic</button>
                <button class="cheat-btn" onclick="typeCheat('ICANTTAKEITANYMORE')">Suicide</button>
            </div>

            <div class="cheat-cat">Skins</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('STILLLIKEDRESSINGUP')">Random Skin</button>
                <button class="cheat-btn" onclick="typeCheat('IDONTHAVETHEMONEYSONNY')">Sonny</button>
                <button class="cheat-btn" onclick="typeCheat('LOOKLIKELANCE')">Lance</button>
                <button class="cheat-btn" onclick="typeCheat('ILOOKLIKEHILARY')">Hilary</button>
                <button class="cheat-btn" onclick="typeCheat('ROCKANDROLLMAN')">Jezz</button>
                <button class="cheat-btn" onclick="typeCheat('WELOVEOURDICK')">Dick</button>
                <button class="cheat-btn" onclick="typeCheat('MYSONISALAWYER')">Ken</button>
                <button class="cheat-btn" onclick="typeCheat('ONEARMEDBANDIT')">Phil</button>
                <button class="cheat-btn" onclick="typeCheat('FOXYLITTLETHING')">Mercedes</button>
                <button class="cheat-btn" onclick="typeCheat('CHEATSHAVEBEENCRACKED')">Diaz</button>
                <button class="cheat-btn" onclick="typeCheat('IWANTBIGTITS')">Candy</button>
                <button class="cheat-btn" onclick="typeCheat('CERTAINDEATH')">Cigarette</button>
                <button class="cheat-btn" onclick="typeCheat('DEEPFRIEDMARSBARS')">Fat Tommy</button>
                <button class="cheat-btn" onclick="typeCheat('PROGRAMMER')">Thin Tommy</button>
            </div>

            <div class="cheat-cat">Vehicles</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('PANZER')">Tank</button>
                <button class="cheat-btn" onclick="typeCheat('GETTHEREFAST')">Sabre Turbo</button>
                <button class="cheat-btn" onclick="typeCheat('GETTHEREQUICKLY')">Bloodring A</button>
                <button class="cheat-btn" onclick="typeCheat('TRAVELINSTYLE')">Bloodring B</button>
                <button class="cheat-btn" onclick="typeCheat('GETTHEREVERYFASTINDEED')">Hotring A</button>
                <button class="cheat-btn" onclick="typeCheat('GETTHEREAMAZINGLYFAST')">Hotring B</button>
                <button class="cheat-btn" onclick="typeCheat('THELASTRIDE')">Hearse</button>
                <button class="cheat-btn" onclick="typeCheat('ROCKANDROLLCAR')">Limo</button>
                <button class="cheat-btn" onclick="typeCheat('BETTERTHANWALKING')">Caddy</button>
                <button class="cheat-btn" onclick="typeCheat('RUBBISHCAR')">Trashmaster</button>
            </div>

            <div class="cheat-cat">Vehicle Effects</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('COMEFLYWITHME')">Flying Cars</button>
                <button class="cheat-btn" onclick="typeCheat('AIRSHIP')">Flying Boats</button>
                <button class="cheat-btn" onclick="typeCheat('SEAWAYS')">Water Drive</button>
                <button class="cheat-btn" onclick="typeCheat('WHEELSAREALLINEED')">Only Wheels</button>
                <button class="cheat-btn" onclick="typeCheat('GRIPISEVERYTHING')">Perfect Handling</button>
                <button class="cheat-btn" onclick="typeCheat('IWANTITPAINTEDBLACK')">Black Cars</button>
                <button class="cheat-btn" onclick="typeCheat('AHAIRDRESSERSCAR')">Pink Cars</button>
                <button class="cheat-btn" onclick="typeCheat('LOADSOFLITTLETHINGS')">Small Wheels</button>
            </div>

            <div class="cheat-cat">Weather</div>
            <div class="cheat-grid">
                <button class="cheat-btn" onclick="typeCheat('ALOVELYDAY')">Sunny</button>
                <button class="cheat-btn" onclick="typeCheat('APLEASANTDAY')">Cloudy</button>
                <button class="cheat-btn" onclick="typeCheat('ABITDRIEG')">Very Cloudy</button>
                <button class="cheat-btn" onclick="typeCheat('CATSANDDOGS')">Rainy</button>
                <button class="cheat-btn" onclick="typeCheat('CANTSEEATHING')">Foggy</button>
            </div>
        </div>
    `;
    document.body.appendChild(ui);

    let results = [];
    let isSearching = false;
    let menuOpen = false;
    let lastBuffer = null; // Track buffer for detachment detection
    
    // AirBreak state
    let airbreakEnabled = false;        // Whether currently flying
    let airbreakConfigured = false;
    let airbreakShiftAllowed = false;   // Whether RShift can toggle airbreak
    let playerMatrixAddr = 0;
    let flySpeed = 2.0;
    let keysPressed = { w: false, s: false, a: false, d: false, space: false, shift: false };

    // Get fresh DataView, handling buffer growth/detachment
    function getView() {
        const buf = HEAPU8.buffer;
        if (lastBuffer !== buf) {
            lastBuffer = buf;
            console.log('[CheatEngine] Buffer changed, size:', buf.byteLength);
        }
        return new DataView(buf);
    }

    // Safely read value at address
    function readValue(view, addr, type) {
        try {
            const bufLen = view.buffer.byteLength;
            if (addr < 0 || addr >= bufLen - 8) return null;
            switch(type) {
                case 'i32': return view.getInt32(addr, true);
                case 'f32': return view.getFloat32(addr, true);
                case 'i16': return view.getInt16(addr, true);
                case 'i8': return view.getInt8(addr);
                case 'f64': return view.getFloat64(addr, true);
            }
        } catch(e) {
            console.warn('[CheatEngine] Read error at', addr, e);
        }
        return null;
    }

    // Snapshot current values for all results (call before making changes in game)
    function snapshotValues() {
        if (results.length === 0) return;
        const view = getView();
        let updated = 0;
        for (const res of results) {
            const val = readValue(view, res.addr, res.type);
            if (val !== null) {
                res.lastVal = val;
                updated++;
            }
        }
        updateStatus(`Snapshot: ${updated} values captured`);
    }

    // Intercept game events
    const originalRegister = JSEvents.registerOrRemoveHandler;
    JSEvents.registerOrRemoveHandler = function(h) {
        if (h.handlerFunc && !h._wrapped) {
            const originalHandler = h.handlerFunc;
            h.handlerFunc = function(e) {
                if (menuOpen && !e._isCheat && (h.eventTypeString.startsWith('key') || h.eventTypeString.startsWith('mouse') || h.eventTypeString.startsWith('touch'))) {
                    if (e && e.key === 'F3') return originalHandler.apply(this, arguments);
                    return;
                }
                return originalHandler.apply(this, arguments);
            };
            h._wrapped = true;
        }
        return originalRegister.apply(this, arguments);
    };

    if (JSEvents.eventHandlers) {
        JSEvents.eventHandlers.forEach(h => {
            if (h.handlerFunc && !h._wrapped) {
                const originalHandler = h.handlerFunc;
                h.handlerFunc = function(e) {
                    if (menuOpen && !e._isCheat && (h.eventTypeString.startsWith('key') || h.eventTypeString.startsWith('mouse') || h.eventTypeString.startsWith('touch'))) {
                        if (e && e.key === 'F3') return originalHandler.apply(this, arguments);
                        return;
                    }
                    return originalHandler.apply(this, arguments);
                };
                h._wrapped = true;
            }
        });
    }

    function toggleMenu() {
        menuOpen = !menuOpen;
        ui.style.display = menuOpen ? 'flex' : 'none';
        toggleBtn.classList.toggle('active', menuOpen);
        
        if (menuOpen) {
            if (document.pointerLockElement) document.exitPointerLock();
            document.body.style.cursor = 'default';
            if (Module.canvas) Module.canvas.style.cursor = 'default';
        } else {
            if (Module.canvas) Module.canvas.style.cursor = 'none';
            document.body.style.cursor = 'none';
        }
    }

    // Keyboard toggle (F3)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F3') {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        }
    }, true);

    // Touch toggle button handler with drag support
    let toggleBtnDragging = false;
    let toggleBtnStartX = 0;
    let toggleBtnStartY = 0;
    let toggleBtnInitialLeft = 0;
    let toggleBtnInitialTop = 0;
    const dragThreshold = 10; // pixels to move before considered a drag
    
    // Load saved position from localStorage
    const savedPos = localStorage.getItem('cheat-toggle-pos');
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            toggleBtn.style.right = 'auto';
            toggleBtn.style.left = pos.left + 'px';
            toggleBtn.style.top = pos.top + 'px';
        } catch(e) {}
    }
    
    toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!toggleBtnDragging) {
            toggleMenu();
        }
    });
    
    if (isTouch) {
        toggleBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleBtnDragging = false;
            
            const touch = e.touches[0];
            toggleBtnStartX = touch.clientX;
            toggleBtnStartY = touch.clientY;
            
            // Get current position
            const rect = toggleBtn.getBoundingClientRect();
            toggleBtnInitialLeft = rect.left;
            toggleBtnInitialTop = rect.top;
        }, { passive: false });
        
        toggleBtn.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - toggleBtnStartX;
            const deltaY = touch.clientY - toggleBtnStartY;
            
            // Check if we've moved enough to consider it a drag
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                toggleBtnDragging = true;
            }
            
            if (toggleBtnDragging) {
                let newLeft = toggleBtnInitialLeft + deltaX;
                let newTop = toggleBtnInitialTop + deltaY;
                
                // Clamp to screen bounds
                const btnWidth = toggleBtn.offsetWidth;
                const btnHeight = toggleBtn.offsetHeight;
                newLeft = Math.max(0, Math.min(window.innerWidth - btnWidth, newLeft));
                newTop = Math.max(0, Math.min(window.innerHeight - btnHeight, newTop));
                
                toggleBtn.style.right = 'auto';
                toggleBtn.style.left = newLeft + 'px';
                toggleBtn.style.top = newTop + 'px';
            }
        }, { passive: false });
        
        toggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (toggleBtnDragging) {
                // Save position
                const rect = toggleBtn.getBoundingClientRect();
                localStorage.setItem('cheat-toggle-pos', JSON.stringify({
                    left: rect.left,
                    top: rect.top
                }));
            } else {
                // It was a tap, not a drag - toggle menu
                toggleMenu();
            }
            
            toggleBtnDragging = false;
        }, { passive: false });
    }
    
    // Close button handler (works for both touch and click)
    const closeBtn = document.getElementById('cheat-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleMenu();
        });
        
        if (isTouch) {
            closeBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleMenu();
            }, { passive: false });
        }
    }

    window.addEventListener('keydown', (e) => {
        if (menuOpen && e.target.tagName === 'INPUT') e.stopPropagation();
    }, true);
    window.addEventListener('keyup', (e) => {
        if (menuOpen && e.target.tagName === 'INPUT') e.stopPropagation();
    }, true);
    window.addEventListener('keypress', (e) => {
        if (menuOpen && e.target.tagName === 'INPUT') e.stopPropagation();
    }, true);
    window.addEventListener('mousedown', (e) => {
        if (menuOpen && ui.contains(e.target)) e.stopPropagation();
    }, true);
    
    // Touch event handling for menu
    window.addEventListener('touchstart', (e) => {
        if (menuOpen && ui.contains(e.target)) e.stopPropagation();
    }, true);
    window.addEventListener('touchmove', (e) => {
        if (menuOpen && ui.contains(e.target)) e.stopPropagation();
    }, true);
    window.addEventListener('touchend', (e) => {
        if (menuOpen && ui.contains(e.target)) e.stopPropagation();
    }, true);

    function updateStatus(text) {
        document.getElementById('ce-status').textContent = text;
    }

    function checkMatch(view, addr, type, val, tolerance = 0.5) {
        try {
            switch(type) {
                case 'i32': {
                    const v = view.getInt32(addr, true);
                    return Math.abs(v - val) <= tolerance;
                }
                case 'f32': {
                    const v = view.getFloat32(addr, true);
                    // For floats, check if it's a reasonable number and within tolerance
                    if (!isFinite(v)) return false;
                    return Math.abs(v - val) <= tolerance;
                }
                case 'i16': {
                    const v = view.getInt16(addr, true);
                    return Math.abs(v - val) <= tolerance;
                }
                case 'i8': {
                    const v = view.getInt8(addr);
                    return Math.abs(v - val) <= tolerance;
                }
                case 'f64': {
                    const v = view.getFloat64(addr, true);
                    if (!isFinite(v)) return false;
                    return Math.abs(v - val) <= tolerance;
                }
                case 'any':
                    // Check all types with tolerance
                    const i32 = view.getInt32(addr, true);
                    if (Math.abs(i32 - val) <= tolerance) return 'i32';
                    
                    const f32 = view.getFloat32(addr, true);
                    if (isFinite(f32) && Math.abs(f32 - val) <= tolerance) return 'f32';
                    
                    const i16 = view.getInt16(addr, true);
                    if (Math.abs(i16 - val) <= tolerance) return 'i16';
                    
                    const i8 = view.getInt8(addr);
                    if (Math.abs(i8 - val) <= tolerance) return 'i8';
                    
                    return false;
            }
        } catch(e) {}
        return false;
    }

    function firstSearch() {
        if (isSearching) return;
        const valStr = document.getElementById('ce-value').value;
        const type = document.getElementById('ce-type').value;
        const val = parseFloat(valStr);
        
        if (isNaN(val)) {
            updateStatus("Invalid value");
            return;
        }

        isSearching = true;
        updateStatus("Searching...");
        results = [];

        setTimeout(() => {
            // Always get fresh buffer
            const view = getView();
            const bufferLen = view.buffer.byteLength;
            
            console.log(`[CheatEngine] New search: value=${val}, type=${type}, bufferLen=${bufferLen}`);
            
            // Use step 4 for aligned types, step 1 only for i8
            const step = (type === 'i8') ? 1 : 4;
            
            for (let i = 0; i < bufferLen - 8; i += step) {
                const matchType = checkMatch(view, i, type, val);
                if (matchType) {
                    const resType = type === 'any' ? matchType : type;
                    const currentVal = readValue(view, i, resType);
                    if (currentVal !== null) {
                        results.push({addr: i, type: resType, lastVal: currentVal});
                        if (results.length > 100000) break;
                    }
                }
            }

            console.log(`[CheatEngine] Search complete: found ${results.length} addresses`);
            updateStatus(`Found ${results.length} addresses`);
            displayResults();
            isSearching = false;
        }, 10);
    }

    function nextSearch() {
        if (isSearching || results.length === 0) {
            if (results.length === 0) {
                updateStatus("No results. Do 'New' search first.");
            }
            return;
        }
        const valStr = document.getElementById('ce-value').value;
        const val = parseFloat(valStr);

        if (isNaN(val)) {
            updateStatus("Invalid value");
            return;
        }

        isSearching = true;
        const startCount = results.length;
        updateStatus(`Filtering ${startCount} addresses...`);
        const newResults = [];
        const view = getView();
        const bufLen = view.buffer.byteLength;

        console.log(`[CheatEngine] Next search: value=${val}, checking ${results.length} addresses`);
        
        let skipped = 0;
        let checked = 0;
        
        for (const res of results) {
            // Skip out of bounds addresses
            if (res.addr < 0 || res.addr >= bufLen - 8) {
                skipped++;
                continue;
            }
            
            checked++;
            const currentVal = readValue(view, res.addr, res.type);
            
            if (currentVal === null) {
                skipped++;
                continue;
            }
            
            // Use tolerance for matching
            const tolerance = 0.5;
            const matches = Math.abs(currentVal - val) <= tolerance;
            
            if (matches) {
                res.lastVal = currentVal;
                newResults.push(res);
            }
        }

        console.log(`[CheatEngine] Checked: ${checked}, Skipped: ${skipped}, Found: ${newResults.length}`);
        
        results = newResults;
        updateStatus(`Found ${results.length}/${startCount} addresses`);
        displayResults();
        isSearching = false;
    }

    function displayResults() {
        const container = document.getElementById('ce-results');
        container.innerHTML = '';
        
        const limit = Math.min(results.length, 100);
        const view = getView();
        for (let i = 0; i < limit; i++) {
            const res = results[i];
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.marginBottom = '2px';
            div.style.borderBottom = '1px solid #333';
            
            let currentVal;
            try {
                switch(res.type) {
                    case 'i32': currentVal = view.getInt32(res.addr, true); break;
                    case 'f32': currentVal = view.getFloat32(res.addr, true).toFixed(2); break;
                    case 'i16': currentVal = view.getInt16(res.addr, true); break;
                    case 'i8': currentVal = view.getInt8(res.addr); break;
                    case 'f64': currentVal = view.getFloat64(res.addr, true).toFixed(2); break;
                }
            } catch(e) { currentVal = "???"; }

            div.innerHTML = `
                <span style="color: #ff00ff;">0x${res.addr.toString(16)}</span>
                <span style="color: #0ff;">${currentVal}</span>
                <button class="cheat-btn" onclick="editAddr(${res.addr}, '${res.type}')">Edit</button>
            `;
            container.appendChild(div);
        }
    }

    window.editAddr = function(addr, type) {
        const newVal = prompt(`Enter new value for 0x${addr.toString(16)} (${type}):`);
        if (newVal === null) return;
        
        const view = getView();
        try {
            switch(type) {
                case 'i32': view.setInt32(addr, parseInt(newVal), true); break;
                case 'f32': view.setFloat32(addr, parseFloat(newVal), true); break;
                case 'i16': view.setInt16(addr, parseInt(newVal), true); break;
                case 'i8': view.setInt8(addr, parseInt(newVal)); break;
                case 'f64': view.setFloat64(addr, parseFloat(newVal), true); break;
            }
        } catch(e) { alert("Error writing to memory"); }
        displayResults();
        if (document.getElementById('ce-manual-results').style.display === 'block') {
            viewManualAddr();
        }
    };

    function filterResults(mode) {
        if (isSearching || results.length === 0) {
            if (results.length === 0) {
                updateStatus("No results to filter. Do 'New' search first.");
            }
            return;
        }
        isSearching = true;
        updateStatus("Filtering...");
        
        const newResults = [];
        const view = getView();
        const bufLen = view.buffer.byteLength;

        for (const res of results) {
            // Skip if address is out of bounds (buffer might have changed)
            if (res.addr < 0 || res.addr >= bufLen - 8) continue;
            
            const oldVal = res.lastVal;
            const newVal = readValue(view, res.addr, res.type);
            
            if (newVal === null) continue;
            
            // Handle case where lastVal wasn't set
            if (oldVal === undefined || oldVal === null) {
                // Can't compare - just update lastVal for next time
                res.lastVal = newVal;
                continue;
            }

            let match = false;
            if (mode === 'inc' && newVal > oldVal) match = true;
            if (mode === 'dec' && newVal < oldVal) match = true;
            if (mode === 'changed' && Math.abs(newVal - oldVal) > 0.0001) match = true;

            if (match) {
                res.lastVal = newVal;
                newResults.push(res);
            }
        }

        results = newResults;
        updateStatus(`Found ${results.length} addresses (compared to snapshot)`);
        displayResults();
        isSearching = false;
    }

    function viewManualAddr() {
        const addrStr = document.getElementById('ce-manual-addr').value;
        const addr = parseInt(addrStr, 16);
        const view = getView();
        const bufLen = view.buffer.byteLength;
        
        if (isNaN(addr) || addr < 0 || addr >= bufLen - 8) {
            alert("Invalid address (out of range: 0 - 0x" + (bufLen - 8).toString(16) + ")");
            return;
        }

        const container = document.getElementById('ce-manual-results');
        container.style.display = 'block';
        container.innerHTML = '';
        const types = ['i8', 'i16', 'i32', 'f32', 'f64'];
        
        types.forEach(type => {
            let val;
            try {
                switch(type) {
                    case 'i8': val = view.getInt8(addr); break;
                    case 'i16': val = view.getInt16(addr, true); break;
                    case 'i32': val = view.getInt32(addr, true); break;
                    case 'f32': val = view.getFloat32(addr, true).toFixed(4); break;
                    case 'f64': val = view.getFloat64(addr, true).toFixed(4); break;
                }
                
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.marginBottom = '2px';
                div.innerHTML = `
                    <span style="color: #0ff;">${type.toUpperCase()}:</span>
                    <span>${val}</span>
                    <button class="cheat-btn" onclick="editAddr(${addr}, '${type}')">Edit</button>
                `;
                container.appendChild(div);
            } catch(e) {}
        });
    }

    document.getElementById('ce-view-addr').onclick = viewManualAddr;
    document.getElementById('ce-search').onclick = firstSearch;
    document.getElementById('ce-next').onclick = nextSearch;
    document.getElementById('ce-snap').onclick = snapshotValues;
    document.getElementById('ce-inc').onclick = () => filterResults('inc');
    document.getElementById('ce-dec').onclick = () => filterResults('dec');
    document.getElementById('ce-changed').onclick = () => filterResults('changed');
    document.getElementById('ce-reset').onclick = () => {
        results = [];
        document.getElementById('ce-results').innerHTML = '';
        updateStatus("Reset");
    };

    window.typeCheat = async function(code) {
        console.log("Typing cheat:", code);
        updateStatus("Entering cheat...");
        
        if (typeof JSEvents === 'undefined' || !JSEvents.eventHandlers) return;

        const handlers = JSEvents.eventHandlers.filter(h => 
            h.eventTypeString === 'keydown' || h.eventTypeString === 'keypress' || h.eventTypeString === 'keyup'
        );

        const eventDataPtr = _malloc(160);

        for (let i = 0; i < code.length; i++) {
            const char = code[i].toUpperCase();
            const keyCode = char.charCodeAt(0);
            
            const fillBuffer = () => {
                for (let j = 0; j < 160; j++) HEAPU8[eventDataPtr + j] = 0;
                HEAPF64[eventDataPtr >> 3] = performance.now();
                const idx = eventDataPtr >> 2;
                HEAP32[idx + 5] = keyCode;
                HEAP32[idx + 6] = keyCode;
                HEAP32[idx + 7] = keyCode;
                stringToUTF8(char, eventDataPtr + 32, 32);
                stringToUTF8('Key' + char, eventDataPtr + 64, 32);
                stringToUTF8(char, eventDataPtr + 96, 32);
            };

            const fakeEvent = { _isCheat: true };

            fillBuffer();
            for (const h of handlers) {
                if (h.eventTypeString === 'keydown') getWasmTableEntry(h.callbackfunc)(h.eventTypeId, eventDataPtr, h.userData);
            }
            fillBuffer();
            for (const h of handlers) {
                if (h.eventTypeString === 'keypress') getWasmTableEntry(h.callbackfunc)(h.eventTypeId, eventDataPtr, h.userData);
            }
            fillBuffer();
            for (const h of handlers) {
                if (h.eventTypeString === 'keyup') getWasmTableEntry(h.callbackfunc)(h.eventTypeId, eventDataPtr, h.userData);
            }
            
            await new Promise(r => setTimeout(r, 5));
        }
        
        _free(eventDataPtr);
        updateStatus("Cheat entered: " + code);
    };

    // ========== AIRBREAK FUNCTIONALITY ==========
    
    // GTA VC structure offsets:
    // CPed +0x354 = health (f32)
    // Heading (rotation) = healthAddr + 0x24 (f32, radians)
    // CEntity +0x04 = CMatrix (embedded)
    // CMatrix +0x34 = X position (f32), +0x38 = Y, +0x3C = Z
    // MoveSpeed (velocity): +0x74 from CEntity = healthAddr - 0x354 + 0x74 = healthAddr - 0x2E0
    //
    // Formula: X = healthAddr - 0x354 + 0x04 + 0x34 = healthAddr - 0x31C
    //          Y = X + 0x4
    //          Z = X + 0x8
    //          heading = healthAddr + 0x24
    //          moveSpeedX = healthAddr - 0x2E0, Y = +0x4, Z = +0x8
    
    let positionAddr = 0;   // X position address (Y at +4, Z at +8)
    let headingAddr = 0;    // Heading/rotation address
    let healthAddr = 0;     // Health address for locking
    let moveSpeedAddr = 0;  // MoveSpeed X address (Y at +4, Z at +8)
    let lockedZ = 0;        // Locked Z value when airbreak enabled
    let lockedHealth = 100; // Locked health value
    let godModeEnabled = false;
    let moneyAddr = 0;      // Money address
    
    // Static addresses for GTA VC
    // Money handle: EN=0x361c50, RU=0x361c60
    // PED_ADDR = read_I32(money_handle - 0xA0)
    // HEALTH = PED_ADDR + 0x350
    function getStaticAddresses() {
        const view = getView();
        const bufLen = view.buffer.byteLength;
        
        const moneyHandleAddr = 0x361c50;
        
        if (moneyHandleAddr >= bufLen - 4) return null;
        
        // Money is at moneyHandleAddr
        moneyAddr = moneyHandleAddr;
        
        // PED_ADDR = read_I32(money_handle - 0xA0)
        const pedPtrAddr = moneyHandleAddr - 0xA0;
        if (pedPtrAddr < 0 || pedPtrAddr >= bufLen - 4) return null;
        
        const pedAddr = view.getInt32(pedPtrAddr, true);
        if (pedAddr <= 0 || pedAddr >= bufLen - 0x400) return null;
        
        // Health = PED_ADDR + 0x350
        const hpAddr = pedAddr + 0x350;
        if (hpAddr < 0 || hpAddr >= bufLen - 4) return null;
        
        return { pedAddr, healthAddr: hpAddr, moneyAddr: moneyHandleAddr };
    }
    
    function setupAirbreak() {
        const addrs = getStaticAddresses();
        if (!addrs) {
            document.getElementById('ce-airbreak-status').textContent = 'Failed to find addresses';
            document.getElementById('ce-airbreak-status').style.color = '#f00';
            return false;
        }
        
        healthAddr = addrs.healthAddr;
        const view = getView();
        const bufLen = view.buffer.byteLength;
        
        // Calculate addresses:
        // Position: healthAddr - 0x354 + 0x04 + 0x34 = healthAddr - 0x31C
        // Heading: healthAddr + 0x24
        
        const HEALTH_OFFSET = 0x354;
        const MATRIX_OFFSET = 0x04;
        const X_IN_MATRIX = 0x34;
        const HEADING_OFFSET = 0x24;  // Relative to health address
        const MOVESPEED_OFFSET = 0x74;  // MoveSpeed from CEntity base
        
        const entityBase = healthAddr - HEALTH_OFFSET;
        positionAddr = entityBase + MATRIX_OFFSET + X_IN_MATRIX;  // = healthAddr - 0x31C
        headingAddr = healthAddr + HEADING_OFFSET;
        moveSpeedAddr = entityBase + MOVESPEED_OFFSET;  // = healthAddr - 0x2E0
        
        console.log(`[AirBreak] Health addr: 0x${healthAddr.toString(16)}`);
        console.log(`[AirBreak] Entity base: 0x${entityBase.toString(16)}`);
        console.log(`[AirBreak] Position addr: 0x${positionAddr.toString(16)}`);
        console.log(`[AirBreak] Heading addr: 0x${headingAddr.toString(16)}`);
        console.log(`[AirBreak] MoveSpeed addr: 0x${moveSpeedAddr.toString(16)}`);
        
        // Validate addresses
        if (positionAddr < 0 || positionAddr >= bufLen - 12 ||
            headingAddr < 0 || headingAddr >= bufLen - 4) {
            document.getElementById('ce-airbreak-status').textContent = 'Address out of range';
            return;
        }
        
        // Read current values
        const x = view.getFloat32(positionAddr, true);
        const y = view.getFloat32(positionAddr + 4, true);
        const z = view.getFloat32(positionAddr + 8, true);
        const heading = view.getFloat32(headingAddr, true);
        const health = view.getFloat32(healthAddr, true);
        
        console.log(`[AirBreak] Position: X=${x.toFixed(2)}, Y=${y.toFixed(2)}, Z=${z.toFixed(2)}`);
        console.log(`[AirBreak] Heading: ${heading.toFixed(2)} rad (${(heading * 180 / Math.PI).toFixed(1)}°)`);
        console.log(`[AirBreak] Health: ${health.toFixed(2)}`);
        
        // Store current Z and health for locking
        lockedZ = z;
        lockedHealth = health;
        
        // Sanity check
        if (!isFinite(x) || !isFinite(y) || !isFinite(z) ||
            Math.abs(x) > 5000 || Math.abs(y) > 5000 || z < -50 || z > 1000) {
            document.getElementById('ce-airbreak-status').textContent =
                `Suspicious pos: ${x.toFixed(0)},${y.toFixed(0)},${z.toFixed(0)} - try anyway? [RShift]`;
            document.getElementById('ce-airbreak-status').style.color = '#f80';
        } else {
            document.getElementById('ce-airbreak-status').textContent =
                `Ready! [RShift to fly] H:${(heading * 180 / Math.PI).toFixed(0)}°`;
            document.getElementById('ce-airbreak-status').style.color = '#0f0';
        }
        
        // Store for compatibility
        playerMatrixAddr = positionAddr;
        airbreakConfigured = true;
        
        updatePositionDisplay();
        return true;
    }
    
    // Toggle GodMode
    function toggleGodMode(e) {
        const checkbox = document.getElementById('ce-toggle-godmode');
        
        // If triggered by event, use checkbox state
        if (e && e.target === checkbox) {
            godModeEnabled = checkbox.checked;
        } else {
            // If triggered programmatically, toggle and update checkbox
            godModeEnabled = !godModeEnabled;
            checkbox.checked = godModeEnabled;
        }

        const addrs = getStaticAddresses();
        if (!addrs) {
            document.getElementById('ce-airbreak-status').textContent = 'Failed to find HP address';
            document.getElementById('ce-airbreak-status').style.color = '#f00';
            // Revert if failed
            if (godModeEnabled) {
                godModeEnabled = false;
                checkbox.checked = false;
            }
            return;
        }
        
        // If disabling GodMode, reset HP from 999 to 100
        if (!godModeEnabled) {
            const view = getView();
            try {
                view.setFloat32(addrs.healthAddr, 100.0, true);
            } catch(e) {}
        }
        
        document.getElementById('ce-airbreak-status').textContent = godModeEnabled ? 'GodMode ON - Infinite HP' : 'GodMode OFF (HP reset to 100)';
        document.getElementById('ce-airbreak-status').style.color = godModeEnabled ? '#0f0' : '#888';
    }
    
    // GodMode tick - runs constantly to keep HP at max
    function godModeTick() {
        if (!godModeEnabled) return;
        
        const addrs = getStaticAddresses();
        if (!addrs) return;
        
        const view = getView();
        try {
            view.setFloat32(addrs.healthAddr, 999.0, true);
        } catch(e) {}
    }
    
    // Add money
    function addMoney() {
        const addrs = getStaticAddresses();
        if (!addrs) {
            document.getElementById('ce-airbreak-status').textContent = 'Failed to find money address';
            document.getElementById('ce-airbreak-status').style.color = '#f00';
            return;
        }
        
        const view = getView();
        try {
            const currentMoney = view.getInt32(addrs.moneyAddr, true);
            view.setInt32(addrs.moneyAddr, currentMoney + 9999999, true);
            document.getElementById('ce-airbreak-status').textContent = '+$9999999 added!';
            document.getElementById('ce-airbreak-status').style.color = '#ffd700';
        } catch(e) {
            document.getElementById('ce-airbreak-status').textContent = 'Failed to add money';
            document.getElementById('ce-airbreak-status').style.color = '#f00';
        }
    }
    
    // Toggle AirBrake availability (whether RShift can trigger it)
    function toggleAirBrake(e) {
        const checkbox = document.getElementById('ce-toggle-airbreak');
        
        // If triggered by event, use checkbox state
        if (e && e.target === checkbox) {
            airbreakShiftAllowed = checkbox.checked;
        } else {
            // If triggered programmatically, toggle and update checkbox
            airbreakShiftAllowed = !airbreakShiftAllowed;
            checkbox.checked = airbreakShiftAllowed;
        }
        
        // If disabling, also stop flying
        if (!airbreakShiftAllowed && airbreakEnabled) {
            airbreakEnabled = false;
            document.getElementById('ce-airbreak-status').textContent = 'AirBreak disabled';
            document.getElementById('ce-airbreak-status').style.color = '#888';
        } else if (airbreakShiftAllowed) {
            // Setup if needed when enabling
            if (!airbreakConfigured) {
                setupAirbreak();
            }
            document.getElementById('ce-airbreak-status').textContent = 'AirBreak enabled (RShift to fly)';
            document.getElementById('ce-airbreak-status').style.color = '#0f0';
        } else {
            document.getElementById('ce-airbreak-status').textContent = 'AirBreak disabled';
            document.getElementById('ce-airbreak-status').style.color = '#888';
        }
    }
    
    // Toggle actual flying state (called by RShift)
    function toggleFlying() {
        if (!airbreakShiftAllowed) return false;
        
        if (!airbreakConfigured) {
            if (!setupAirbreak()) {
                return false;
            }
        }
        
        airbreakEnabled = !airbreakEnabled;
        
        if (airbreakEnabled) {
            const view = getView();
            lockedZ = view.getFloat32(positionAddr + 8, true);
            lockedHealth = view.getFloat32(healthAddr, true);
        }
        
        document.getElementById('ce-airbreak-status').textContent = airbreakEnabled ?
            `FLYING! Z=${lockedZ.toFixed(1)}` : 'AirBreak enabled (RShift to fly)';
        document.getElementById('ce-airbreak-status').style.color = airbreakEnabled ? '#ff0' : '#0f0';
        
        return true;
    }
    
    function updatePositionDisplay() {
        if (!airbreakConfigured || positionAddr === 0) return;
        
        const view = getView();
        const bufLen = view.buffer.byteLength;
        
        if (positionAddr < 0 || positionAddr >= bufLen - 12) return;
        
        try {
            const x = view.getFloat32(positionAddr, true);
            const y = view.getFloat32(positionAddr + 4, true);
            const z = view.getFloat32(positionAddr + 8, true);
            const heading = view.getFloat32(headingAddr, true);
            const hp = view.getFloat32(healthAddr, true);
            
            document.getElementById('ce-pos-display').textContent =
                `X:${x.toFixed(1)} Y:${y.toFixed(1)} Z:${z.toFixed(1)} H:${(heading * 180 / Math.PI).toFixed(0)}° HP:${hp.toFixed(0)}` +
                (airbreakEnabled ? ' [FLY]' : '');
        } catch(e) {}
    }
    
    function airbreakTick() {
        if (!airbreakEnabled || !airbreakConfigured || positionAddr === 0) return;
        
        const view = getView();
        const bufLen = view.buffer.byteLength;
        
        if (positionAddr < 0 || positionAddr >= bufLen - 12) return;
        
        try {
            // Read current position
            let x = view.getFloat32(positionAddr, true);
            let y = view.getFloat32(positionAddr + 4, true);
            let z = view.getFloat32(positionAddr + 8, true);
            
            // Read heading (rotation in radians)
            const headingRaw = view.getFloat32(headingAddr, true);
            // In GTA heading is inverted (360 - h), so we negate it
            const heading = -headingRaw;
            
            const speed = parseFloat(document.getElementById('ce-fly-speed').value) || 2.0;
            
            // Calculate forward/backward direction based on heading
            const sinH = Math.sin(heading);
            const cosH = Math.cos(heading);
            
            // Movement relative to player heading
            if (keysPressed.w) {  // Forward
                x += sinH * speed;
                y += cosH * speed;
            }
            if (keysPressed.s) {  // Backward
                x -= sinH * speed;
                y -= cosH * speed;
            }
            if (keysPressed.a) {  // Strafe left
                x -= cosH * speed;
                y += sinH * speed;
            }
            if (keysPressed.d) {  // Strafe right
                x += cosH * speed;
                y -= sinH * speed;
            }
            
            // Z only changes on Space/LShift, otherwise lock it
            if (keysPressed.space) {
                lockedZ += speed;
            }
            if (keysPressed.shift) {
                lockedZ -= speed;
            }
            z = lockedZ;  // Always use locked Z
            
            // Write new position
            view.setFloat32(positionAddr, x, true);
            view.setFloat32(positionAddr + 4, y, true);
            view.setFloat32(positionAddr + 8, z, true);
            
            // Lock health
            view.setFloat32(healthAddr, lockedHealth, true);
            
            // Zero out moveSpeed (velocity) on all axes to prevent falling/drifting
            view.setFloat32(moveSpeedAddr, 0, true);      // X
            view.setFloat32(moveSpeedAddr + 4, 0, true);  // Y
            view.setFloat32(moveSpeedAddr + 8, 0, true);  // Z
            
            updatePositionDisplay();
        } catch(e) {
            console.warn('[AirBreak] Tick error:', e);
        }
    }
    
    // Track movement keys for airbreak (works even when menu closed)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ShiftRight' || (e.key === 'Shift' && e.location === 2)) {
            // Right Shift - toggle flying only if airbreak is allowed
            if (!airbreakShiftAllowed) return;
            toggleFlying();
            return;
        }
        
        if (!airbreakEnabled) return;
        
        // Track movement keys using e.code (works regardless of keyboard layout)
        const code = e.code;
        if (code === 'KeyW') keysPressed.w = true;
        if (code === 'KeyS') keysPressed.s = true;
        if (code === 'KeyA') keysPressed.a = true;
        if (code === 'KeyD') keysPressed.d = true;
        if (code === 'Space') keysPressed.space = true;
        if (code === 'ShiftLeft') keysPressed.shift = true;
    }, true);
    
    window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'KeyW') keysPressed.w = false;
        if (code === 'KeyS') keysPressed.s = false;
        if (code === 'KeyA') keysPressed.a = false;
        if (code === 'KeyD') keysPressed.d = false;
        if (code === 'Space') keysPressed.space = false;
        if (code === 'ShiftLeft') keysPressed.shift = false;
    }, true);
    
    // AirBreak update loop
    setInterval(airbreakTick, 16); // ~60fps
    setInterval(godModeTick, 100); // GodMode tick
    setInterval(updatePositionDisplay, 100);
    
    // Toggle button handlers
    document.getElementById('ce-toggle-airbreak').onchange = toggleAirBrake;
    document.getElementById('ce-toggle-godmode').onchange = toggleGodMode;
    document.getElementById('ce-add-money').onclick = addMoney;
    document.getElementById('ce-fly-speed').onchange = () => {
        flySpeed = parseFloat(document.getElementById('ce-fly-speed').value) || 2.0;
    };

    // ========== TOUCH CONTROLS FOR AIRBREAK ==========
    
    if (isTouch) {
        const joystick = document.getElementById('airbreak-joystick');
        const joystickKnob = document.getElementById('airbreak-joystick-knob');
        const upBtn = document.getElementById('airbreak-up-btn');
        const downBtn = document.getElementById('airbreak-down-btn');
        const verticalBtns = document.getElementById('airbreak-vertical-btns');
        
        let joystickActive = false;
        let joystickCenterX = 0;
        let joystickCenterY = 0;
        const joystickRadius = 60; // Half of the joystick width
        const deadzone = 15;
        
        // Update visibility of touch controls based on airbreak state
        function updateTouchControlsVisibility() {
            // Hide all touch controls when menu is open
            if (menuOpen) {
                airbreakTouchControls.classList.remove('active');
                verticalBtns.style.display = 'none';
                flyToggleBtn.classList.remove('visible');
                return;
            }
            
            if (airbreakConfigured && airbreakEnabled && airbreakShiftAllowed) {
                airbreakTouchControls.classList.add('active');
                verticalBtns.style.display = 'flex';
            } else {
                airbreakTouchControls.classList.remove('active');
                verticalBtns.style.display = 'none';
            }
            
            // Show fly toggle button only when airbreak is allowed (toggle is ON)
            if (airbreakConfigured && airbreakShiftAllowed) {
                flyToggleBtn.classList.add('visible');
                flyToggleBtn.classList.toggle('active', airbreakEnabled);
                flyToggleBtn.textContent = airbreakEnabled ? 'STOP' : 'FLY';
            } else {
                flyToggleBtn.classList.remove('visible');
            }
        }
        
        // Fly toggle button with drag support
        let flyBtnDragging = false;
        let flyBtnStartX = 0;
        let flyBtnStartY = 0;
        let flyBtnInitialRight = 0;
        let flyBtnInitialBottom = 0;
        
        // Load saved fly button position
        const savedFlyPos = localStorage.getItem('cheat-fly-pos');
        if (savedFlyPos) {
            try {
                const pos = JSON.parse(savedFlyPos);
                flyToggleBtn.style.right = pos.right + 'px';
                flyToggleBtn.style.bottom = pos.bottom + 'px';
            } catch(e) {}
        }
        
        flyToggleBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            flyBtnDragging = false;
            
            const touch = e.touches[0];
            flyBtnStartX = touch.clientX;
            flyBtnStartY = touch.clientY;
            
            // Get current position (calculate from right/bottom)
            const rect = flyToggleBtn.getBoundingClientRect();
            flyBtnInitialRight = window.innerWidth - rect.right;
            flyBtnInitialBottom = window.innerHeight - rect.bottom;
        }, { passive: false });
        
        flyToggleBtn.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const touch = e.touches[0];
            const deltaX = touch.clientX - flyBtnStartX;
            const deltaY = touch.clientY - flyBtnStartY;
            
            // Check if we've moved enough to consider it a drag
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                flyBtnDragging = true;
            }
            
            if (flyBtnDragging) {
                let newRight = flyBtnInitialRight - deltaX;
                let newBottom = flyBtnInitialBottom - deltaY;
                
                // Clamp to screen bounds
                const btnWidth = flyToggleBtn.offsetWidth;
                const btnHeight = flyToggleBtn.offsetHeight;
                newRight = Math.max(0, Math.min(window.innerWidth - btnWidth, newRight));
                newBottom = Math.max(0, Math.min(window.innerHeight - btnHeight, newBottom));
                
                flyToggleBtn.style.right = newRight + 'px';
                flyToggleBtn.style.bottom = newBottom + 'px';
            }
        }, { passive: false });
        
        flyToggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (flyBtnDragging) {
                // Save position
                const rect = flyToggleBtn.getBoundingClientRect();
                localStorage.setItem('cheat-fly-pos', JSON.stringify({
                    right: window.innerWidth - rect.right,
                    bottom: window.innerHeight - rect.bottom
                }));
            } else {
                // It was a tap, not a drag - toggle fly mode
                if (airbreakConfigured) {
                    airbreakEnabled = !airbreakEnabled;
                    
                    if (airbreakEnabled) {
                        const view = getView();
                        lockedZ = view.getFloat32(positionAddr + 8, true);
                        lockedHealth = view.getFloat32(healthAddr, true);
                        console.log(`[AirBreak Touch] ENABLED - Locked Z=${lockedZ.toFixed(2)}, HP=${lockedHealth.toFixed(2)}`);
                    }
                    
                    document.getElementById('ce-airbreak-status').textContent =
                        airbreakEnabled ?
                        `FLYING! Z=${lockedZ.toFixed(1)} HP=${lockedHealth.toFixed(0)}` :
                        `Ready! [Tap FLY]`;
                    document.getElementById('ce-airbreak-status').style.color = airbreakEnabled ? '#ff0' : '#0f0';
                    
                    updateTouchControlsVisibility();
                }
            }
            
            flyBtnDragging = false;
        }, { passive: false });
        
        // Joystick touch handling
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            joystickActive = true;
            
            const rect = joystick.getBoundingClientRect();
            joystickCenterX = rect.left + rect.width / 2;
            joystickCenterY = rect.top + rect.height / 2;
            
            handleJoystickMove(e.touches[0]);
        }, { passive: false });
        
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (joystickActive) {
                handleJoystickMove(e.touches[0]);
            }
        }, { passive: false });
        
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            joystickActive = false;
            
            // Reset knob position
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            
            // Reset movement
            keysPressed.w = false;
            keysPressed.s = false;
            keysPressed.a = false;
            keysPressed.d = false;
        }, { passive: false });
        
        joystick.addEventListener('touchcancel', (e) => {
            joystickActive = false;
            joystickKnob.style.transform = 'translate(-50%, -50%)';
            keysPressed.w = false;
            keysPressed.s = false;
            keysPressed.a = false;
            keysPressed.d = false;
        });
        
        function handleJoystickMove(touch) {
            let deltaX = touch.clientX - joystickCenterX;
            let deltaY = touch.clientY - joystickCenterY;
            
            // Clamp to radius
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > joystickRadius) {
                deltaX = (deltaX / distance) * joystickRadius;
                deltaY = (deltaY / distance) * joystickRadius;
            }
            
            // Move knob
            joystickKnob.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
            
            // Apply movement (with deadzone)
            keysPressed.w = deltaY < -deadzone;
            keysPressed.s = deltaY > deadzone;
            keysPressed.a = deltaX < -deadzone;
            keysPressed.d = deltaX > deadzone;
        }
        
        // Up/Down buttons for vertical movement
        upBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keysPressed.space = true;
        }, { passive: false });
        
        upBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keysPressed.space = false;
        }, { passive: false });
        
        upBtn.addEventListener('touchcancel', () => {
            keysPressed.space = false;
        });
        
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            keysPressed.shift = true;
        }, { passive: false });
        
        downBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            keysPressed.shift = false;
        }, { passive: false });
        
        downBtn.addEventListener('touchcancel', () => {
            keysPressed.shift = false;
        });
        
        // Update controls visibility periodically
        setInterval(updateTouchControlsVisibility, 500);
    }

})();
