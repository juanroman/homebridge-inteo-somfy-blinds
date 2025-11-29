# **Product Requirements Document (PRD)**

# **homebridge-inteo-somfy-blinds**

**Version:** 2.0 (Binary Control MVP)  
**Date:** November 24, 2024  
**Status:** Final

---

## **Executive Summary**

This PRD defines the development of a Homebridge v2.0 native plugin that transforms Somfy RTS curtains controlled via Neocontrol hub from basic switches to proper HomeKit Window Covering accessories. The MVP focuses on binary control (fully open/closed) with honest state management, deferring partial positions to a future release.

---

## **1\. Product Overview**

### **1.1 Problem Statement**

Current Somfy RTS curtain control uses 10 individual HTTP switches (2 per curtain) in HomeKit, appearing as lights/switches rather than proper window coverings. This creates poor UX, incompatibility with Homebridge v2.0, and lacks proper blind representation.

### **1.2 Solution**

Create a Homebridge v2.0 native plugin that:

* Exposes curtains as proper Window Covering accessories  
* Uses existing HTTP scene infrastructure (proven reliable)  
* Provides honest binary control (open/closed/unknown)  
* Makes all commands idempotent (safe to repeat)  
* Clearly communicates limitations

### **1.3 Plugin Name**

`homebridge-inteo-somfy-blinds`

### **1.4 License**

MIT

---

## **2\. Technical Architecture**

### **2.1 Core Design Decisions**

| Decision | Choice | Rationale |
| ----- | ----- | ----- |
| **Control Method** | HTTP Scenes Only | Already working, cloud-enabled, reliable |
| **Position Support** | Binary (0/100) only | No position feedback available |
| **Unknown State** | 50% position | Honest about uncertainty |
| **Stop Support** | Not implemented | No user value identified |
| **State Persistence** | None | Simplify MVP |
| **Error Handling** | Revert to unknown | Clear failure state |
| **Commands** | Idempotent | Safe to retry |

### **2.2 System Architecture**

┌─────────────────────────────────────────────────────────┐  
│                   HomeKit iPhone/iPad                    │  
└────────────────────┬────────────────────────────────────┘  
                     │ HAP Protocol  
┌────────────────────▼────────────────────────────────────┐  
│                  Homebridge v2.0                        │  
│  ┌────────────────────────────────────────────────┐    │  
│  │     homebridge-inteo-somfy-blinds Plugin       │    │  
│  │                                                │    │  
│  │  \- Window Covering Service                    │    │  
│  │  \- Binary Control (0/50/100)                  │    │  
│  │  \- Idempotent Commands                        │    │  
│  │  \- Unknown State Management                   │    │  
│  └────────────────┬───────────────────────────────┘    │  
└───────────────────┼─────────────────────────────────────┘  
                    │ HTTP Requests  
┌───────────────────▼─────────────────────────────────────┐  
│      iOS.neocontrolglobal.com:9151 (Cloud)             │  
└───────────────────┬─────────────────────────────────────┘  
                    │ Internet  
┌───────────────────▼─────────────────────────────────────┐  
│          Neocontrol Hub (Local)                         │  
└───────────────────┬─────────────────────────────────────┘  
                    │ RTS 433MHz  
┌───────────────────▼─────────────────────────────────────┐  
│            Somfy RTS Motors                             │  
└─────────────────────────────────────────────────────────┘

### **2.3 State Management**

Position States:  
\- 0%   \= Closed (confirmed)  
\- 100% \= Open (confirmed)    
\- 50%  \= Unknown (default, error, startup)

State Transitions:  
┌─────────┐  Success  ┌─────────┐  
│ Unknown │ ────────▶ │  Open   │  
│  (50%)  │           │ (100%)  │  
└─────────┘           └─────────┘  
     │                      │  
     │                   Failure  
     │                      ▼  
     │                ┌─────────┐  
     └───────────────▶│ Unknown │  
                      │  (50%)  │  
                      └─────────┘

### **2.4 Configuration Schema**

{  
  "platform": "InteoSomfyBlinds",  
  "name": "Somfy Blinds",  
  "hubMac": "44:D5:F2:C1:03:AC",  
  "baseUrl": "http://iOS.neocontrolglobal.com:9151",  
  "blinds": \[  
    {  
      "name": "Living Room",  
      "openScene": 1,  
      "closeScene": 0  
    }  
  \],  
  "advanced": {  
    "retryAttempts": 3,  
    "requestTimeout": 5000  
  }  
}

---

## **3\. Feature Specifications (MVP \- Binary Control)**

### **3.1 Window Covering Service**

* **Service Type**: WindowCovering  
* **Characteristics**:  
  * CurrentPosition: 0, 50, or 100  
  * TargetPosition: 0 or 100 (50 ignored)  
  * PositionState: STOPPED only (no animation)

### **3.2 Binary Position Control**

class BlindAccessory {  
  private currentPosition \= 50;  // Start unknown  
  private isExecuting \= false;  
    
  async setTargetPosition(value: CharacteristicValue) {  
    // Prevent concurrent commands  
    if (this.isExecuting) return;  
      
    this.isExecuting \= true;  
      
    try {  
      // Binary decision only  
      if (value \> 50\) {  
        await this.sendOpenCommand();  // Idempotent  
        this.currentPosition \= 100;  
      } else if (value \< 50\) {  
        await this.sendCloseCommand();  // Idempotent  
        this.currentPosition \= 0;  
      }  
      // value \=== 50 is ignored (unknown state)  
        
      this.updateCharacteristics();  
        
    } catch (error) {  
      // Failed \= unknown state  
      this.currentPosition \= 50;  
      this.updateCharacteristics();  
      throw new HapStatusError(HAPStatus.SERVICE\_COMMUNICATION\_FAILURE);  
    } finally {  
      this.isExecuting \= false;  
    }  
  }  
}

### **3.3 Idempotent Commands**

* Opening an already open blind is safe  
* Closing an already closed blind is safe  
* Users can retry commands without side effects  
* No state corruption from repeated commands

### **3.4 Error Handling**

* **Network Failure**: Position set to 50% (unknown)  
* **Timeout**: Position set to 50% (unknown)  
* **Retry Logic**: 3 attempts with exponential backoff  
* **Recovery**: Any successful command resets state

### **3.5 Configuration UI Requirements**

* Visual setup wizard for scene numbers  
* Test buttons for each blind  
* Clear indication of binary-only control  
* Warning about partial position limitations

---

## **4\. User Experience**

### **4.1 Supported Commands**

| User Says | System Does | Result Shows |
| ----- | ----- | ----- |
| "Open the blinds" | Sends open scene | 100% |
| "Close the blinds" | Sends close scene | 0% |
| "Set blinds to 70%" | Sends open scene | 100% |
| "Set blinds to 30%" | Sends close scene | 0% |

### **4.2 Position Display**

| State | What User Sees | Meaning |
| ----- | ----- | ----- |
| 0% | Slider at bottom | Successfully closed |
| 50% | Slider at middle | Unknown/Failed state |
| 100% | Slider at top | Successfully opened |

### **4.3 Failure Recovery**

1\. Command fails → Position shows 50%  
2\. HomeKit shows "No Response" briefly  
3\. User taps desired state again  
4\. Command succeeds → Position updates

### **4.4 Migration from Switches**

* Both plugins coexist safely  
* No data loss or conflicts  
* Users migrate at their own pace  
* Clear documentation provided

---

## **5\. Limitations (Must Document Clearly)**

### **5.1 MVP Limitations**

* **No partial positions** (0% or 100% only)  
* **No stop functionality**  
* **No position memory** (starts unknown)  
* **No movement animation**  
* **Requires internet connection**

### **5.2 User Communication**

\#\# Important: This plugin supports fully open or fully closed only

✅ "Hey Siri, open the blinds" \- Works perfectly  
✅ "Hey Siri, close the blinds" \- Works perfectly  
⚠️ "Hey Siri, set blinds to 50%" \- Will do nothing  
⚠️ "Hey Siri, set blinds to 70%" \- Will fully OPEN

Why? Somfy RTS motors have no position feedback.   
Partial positions will be added in v2.0.

---

## **6\. Testing Strategy**

### **6.1 Core Test Cases**

describe('Binary Blind Control', () \=\> {  
  test('starts at unknown position', () \=\> {  
    expect(blind.currentPosition).toBe(50);  
  });  
    
  test('opens when target \> 50', async () \=\> {  
    await blind.setTargetPosition(75);  
    expect(mockServer.lastScene).toBe(1);  // Open scene  
    expect(blind.currentPosition).toBe(100);  
  });  
    
  test('closes when target \< 50', async () \=\> {  
    await blind.setTargetPosition(25);  
    expect(mockServer.lastScene).toBe(0);  // Close scene  
    expect(blind.currentPosition).toBe(0);  
  });  
    
  test('ignores target \= 50', async () \=\> {  
    await blind.setTargetPosition(50);  
    expect(mockServer.commandCount).toBe(0);  
    expect(blind.currentPosition).toBe(50);  
  });  
    
  test('reverts to unknown on failure', async () \=\> {  
    mockServer.simulateFailure();  
    await expect(blind.setTargetPosition(100)).rejects.toThrow();  
    expect(blind.currentPosition).toBe(50);  
  });  
    
  test('commands are idempotent', async () \=\> {  
    await blind.setTargetPosition(100);  
    await blind.setTargetPosition(100);  
    expect(mockServer.commandCount).toBe(2);  
    expect(blind.currentPosition).toBe(100);  
  });  
});

### **6.2 Integration Testing**

\# Local development testing  
npm install \-g homebridge homebridge-config-ui-x  
npm link  \# in plugin directory  
homebridge \-D \-U ./test-config

\# Mock server for testing  
node test/mock-neocontrol-server.js

### **6.3 Acceptance Criteria**

* \[ \] All 5 blinds appear in HomeKit  
* \[ \] Open commands work reliably  
* \[ \] Close commands work reliably  
* \[ \] Failed commands show unknown state  
* \[ \] Commands are idempotent  
* \[ \] 7 days without crashes  
* \[ \] Coexists with switch plugin

---

## **7\. Performance Requirements**

### **7.1 Response Times**

* Command execution: \< 5 seconds  
* Failure detection: \< 5 seconds  
* State update: \< 100ms after response

### **7.2 Reliability**

* Zero crashes in production  
* Graceful network error handling  
* Automatic recovery from failures

---

## **8\. Documentation Requirements**

### **8.1 Required Documentation**

* **README.md**: Installation, configuration, limitations  
* **MIGRATION.md**: Moving from switches to blinds  
* **SCENES.md**: How to find scene numbers  
* **FAQ.md**: Common issues and limitations

### **8.2 Config UI Help Text**

* Clear indication of binary-only control  
* Scene number discovery instructions  
* Test button explanations  
* Limitation warnings

---

## **9\. Success Metrics**

### **9.1 MVP Success Criteria**

* **100% idempotent commands** \- Safe to repeat  
* **Clear failure states** \- Users understand recovery  
* **Zero crashes** \- Production stability  
* **Simple configuration** \- Under 10 minutes

### **9.2 Quality Gates**

* All binary commands work reliably  
* Unknown state properly displayed  
* No state corruption from failures  
* Documentation sets clear expectations

---

## **10\. Release Plan**

### **Phase 1: Development (Week 1\)**

* Core plugin implementation  
* Binary control logic  
* Error handling  
* Basic testing

### **Phase 2: Testing (Week 2\)**

* Integration testing  
* Home deployment  
* 7-day stability test  
* Bug fixes

### **Phase 3: Release (Week 3\)**

* Documentation completion  
* NPM publication  
* GitHub repository  
* User support setup

---

## **11\. Future Roadmap**

### **v1.5 (Partial Positions)**

* Add movement timing configuration  
* Implement position simulation  
* Support percentage positions  
* More complex state management

### **v2.0 (Advanced Features)**

* Position persistence across restarts  
* UDP local control option  
* Stop button support (if requested)  
* Multiple hub support

### **v3.0 (Next Generation)**

* Thread/Matter compatibility  
* Scene auto-discovery  
* Health monitoring dashboard

---

## **12\. Risk Mitigation**

| Risk | Impact | Mitigation |
| ----- | ----- | ----- |
| NeoControl server down | High | Document manual fallback |
| Network failures | Medium | Unknown state \+ idempotent |
| User expects partial positions | Low | Clear documentation |
| Scene number changes | Low | Config UI validation |

---

## **13\. Technical Implementation**

### **13.1 Key Files**

homebridge-inteo-somfy-blinds/  
├── src/  
│   ├── index.ts           \# Plugin entry  
│   ├── platform.ts        \# Platform class  
│   ├── blindAccessory.ts  \# Binary control logic  
│   └── httpClient.ts      \# Scene execution  
├── config.schema.json     \# Config UI  
└── README.md             \# User documentation

### **13.2 Dependencies**

{  
  "engines": {  
    "homebridge": "^1.6.0 || ^2.0.0-beta.0",  
    "node": "^18.20.4 || ^20.15.1 || ^22"  
  },  
  "dependencies": {  
    "axios": "^1.6.0"  
  }  
}

---

## **14\. Acceptance Sign-off**

### **Required for v1.0 Release:**

* \[ \] Binary control working for all 5 blinds  
* \[ \] Unknown state properly managed  
* \[ \] Idempotent commands verified  
* \[ \] 7-day stability achieved  
* \[ \] Documentation complete  
* \[ \] Config UI functional  
* \[ \] Coexistence with switches tested

---

## **Document Control**

| Version | Date | Changes |
| ----- | ----- | ----- |
| 1.0 | 2024-11-24 | Initial PRD |
| 2.0 | 2024-11-24 | Simplified to binary control for MVP |

