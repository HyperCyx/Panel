const parseCsvWithQuotes = (input: string): string[][] => {
        const rows: string[][] = [];
        let inQuotes = false;
        let row: string[] = [];
        let field = '';
        const text = input.trim();

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (inQuotes) {
                if (char === '"') {
                    if (i + 1 < text.length && text[i + 1] === '"') {
                        field += '"';
                        i++; // Skip the next quote (escaped quote)
                    } else {
                        inQuotes = false;
                    }
                } else {
                    field += char;
                }
            } else {
                if (char === '"') {
                    inQuotes = true;
                } else if (char === ';') {
                    row.push(field);
                    field = '';
                } else if (char === '\n' || char === '\r') {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = '';
                    if (char === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
                        i++; // Handle CRLF
                    }
                } else {
                    field += char;
                }
            }
        }

        // Add the last field and row if the file doesn't end with a newline
        if (field || row.length > 0) {
            row.push(field);
            rows.push(row);
        }

        return rows.filter(r => r.length > 1 || (r.length === 1 && r[0]));
};

console.log(parseCsvWithQuotes('datetime;senderid;b-number;mcc/mnc;destination;range;rate;currency;message\n2023-01-01 12:00:00;sender;123456789;123/45;dest;range;0.05;USD;"hello message"\n'));
