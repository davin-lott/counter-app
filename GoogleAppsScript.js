/**
 * Google Apps Script Web App Endpoint for Cumulative Event Counters
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any placeholder code and paste this script.
 * 4. Save and click "Deploy" > "New deployment".
 * 5. Select type "Web app".
 * 6. Set "Execute as" to "Me" (your email) and "Who has access" to "Anyone".
 * 7. Click Deploy, authorize permissions, and copy the "Web app" URL.
 * 8. Paste this URL into the GOOGLE_SCRIPT_URL constant in index.html.
 */

function doPost(e) {
  var result = { status: "success", updated: [] };
  
  try {
    // 1. Validate that payload content was received
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "error", 
        message: "No data received in postData contents." 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. Parse the session data sent from the PWA
    var payload = JSON.parse(e.postData.contents);
    
    // 3. Open the active sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    
    // 4. If sheet is entirely empty, initialize it with header columns
    if (lastRow === 0) {
      sheet.getRange(1, 1).setValue("Event Name");
      sheet.getRange(1, 2).setValue("Total Cumulative Count");
      lastRow = 1;
    }
    
    // 5. Read all data in Columns A and B
    var range = sheet.getRange(1, 1, lastRow, 2);
    var values = range.getValues();
    
    // 6. Iterate through the payload keys (event names)
    for (var eventName in payload) {
      if (payload.hasOwnProperty(eventName)) {
        var countToAdd = parseInt(payload[eventName], 10) || 0;
        
        // Skip zero or negative values to prevent empty updates
        if (countToAdd <= 0) continue;
        
        var found = false;
        
        // 7. Search for a matching event name in Column A (Case-insensitive & trimmed)
        for (var i = 0; i < values.length; i++) {
          var sheetEventName = values[i][0].toString().trim();
          if (sheetEventName.toLowerCase() === eventName.trim().toLowerCase()) {
            var currentRow = i + 1; // Sheets ranges are 1-indexed
            var existingTotal = parseInt(values[i][1], 10) || 0;
            var newTotal = existingTotal + countToAdd;
            
            // Overwrite Column B with the new cumulative grand total
            sheet.getRange(currentRow, 2).setValue(newTotal);
            
            result.updated.push({ 
              event: sheetEventName, 
              added: countToAdd, 
              newTotal: newTotal 
            });
            found = true;
            break;
          }
        }
        
        // 8. Robustness Fallback: If not found in Column A, append to bottom
        if (!found) {
          sheet.appendRow([eventName, countToAdd]);
          result.updated.push({ 
            event: eventName, 
            added: countToAdd, 
            newTotal: countToAdd 
          });
        }
      }
    }
  } catch (err) {
    result = { 
      status: "error", 
      message: "Server Error: " + err.toString() 
    };
  }
  
  // Return standard JSON text output. 
  // Google Apps Script automatically handles CORS redirects for Web Apps using ContentService.
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle preflight CORS requests (OPTIONS) if modern browsers attempt them
 */
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
