import {Component, inject, computed, OnInit} from '@angular/core';
import {CharacterCreationStore} from '../../features/characterDashboard/characterCreation.store';
import {CommonModule} from '@angular/common';
import {ActivatedRoute} from '@angular/router';
import {signal} from '@angular/core';
import { ClassData } from '../../features/characterDashboard/character.types';

@Component({
  selector: 'app-description-page',
  imports: [CommonModule],
  templateUrl: './description-page.html',
  styleUrl: './description-page.scss',
})
export class DescriptionPage implements OnInit {
  characterStore = inject(CharacterCreationStore);
  route = inject(ActivatedRoute);
  className = signal<string>('');
  classSlug = signal<string>('');

  // Find the full class data from the store's ClassData storage
  classData = computed(() => {
    const slug = this.classSlug();
    if (!slug) return null;

    // First try to get from the enhanced classDetails store
    const classDetails = this.characterStore.getClassDetails(slug);
    if (classDetails) {
      return classDetails;
    }

    // Fallback to finding in classes array
    const name = this.className();
    if (!name) return null;
    return this.characterStore.classes().find(c => c.name === name) || null;
  });

  ngOnInit() {
    // Get the class name and slug from the route parameter
    this.route.params.subscribe(params => {
      if (params['name']) {
        const name = decodeURIComponent(params['name']);
        this.className.set(name);
        // Convert name to slug format for store lookup
        const slug = name.toLowerCase().replace(/\s+/g, '-');
        this.classSlug.set(slug);
      }
    });
  }

  // Clean up malformed text (remove extra spaces, normalize whitespace)
  cleanText(text: string): string {
    if (!text) return text;
    // Replace multiple spaces with single space, but preserve paragraph breaks
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s+\n/g, '\n\n')
      .trim();
  }

  // Parse description into sections (###, **, etc.)
  parseDescriptionSections(text: string): any[] {
    if (!text || typeof text !== 'string') return [];

    const sections = [];
    const lines = text.split('\n');
    let currentSection: any = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for section headers (###) or Equipment header
      if (trimmed.startsWith('###') || trimmed === 'Equipment') {
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }
        currentSection = {
          title: trimmed.replace(/^#+\s*/, ''),
          content: ''
        };
        currentContent = [];
      } else if (trimmed) {
        currentContent.push(trimmed);
      }
    }

    // Add last section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections;
  }

  // Clean malformed text with character spacing (e.g., "Y o u" -> "You")
  cleanMalformedText(text: string): string {
    if (!text) return text;

    // Remove spaces between single characters (character-spaced text)
    // But preserve spaces between actual words
    let cleaned = text.replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1$2');

    // Also handle special cases with punctuation
    cleaned = cleaned.replace(/\(\s+\*\s+([a-z])\s+\*\s+\)/g, '(*$1*)');

    // Remove multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  // Parse and format equipment text into readable list
  parseEquipment(text: string): string[] {
    if (!text) return [];

    // First clean the text
    const cleaned = this.cleanMalformedText(text);

    // Remove "Equipment" header if present
    const contentOnly = cleaned.replace(/^Equipment\s*/, '').trim();

    // Split by asterisk-prefixed items (bullet points)
    const items = contentOnly
      .split(/\*\s+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    // Clean up parenthetical options like "(a) great axe or (b) any martial melee weapon"
    return items.map(item => {
      // Format options with parentheses
      return item
        .replace(/\(\s*([a-z])\s*\)/g, '($1)')
        .trim();
    });
  }

  // Helper method to check if value is array
  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  // Helper method to check type
  getType(value: any): string {
    return typeof value;
  }

  // Helper method to convert equipment to string if needed
  getEquipmentAsString(equipment: any): string {
    if (typeof equipment === 'string') {
      return equipment;
    }
    if (Array.isArray(equipment)) {
      return equipment.join(' ');
    }
    return '';
  }

  // Helper method to safely get table data as array
  getTableData(table: any): any[] {
    if (!table) return [];

    // If it's already an array, return it
    if (Array.isArray(table)) {
      return table;
    }

    // Only process if it's a plain object (not a function, HTMLElement, etc.)
    if (typeof table !== 'object') {
      return [];
    }

    try {
      // If it has a rows property and it's an array, use that
      if (table.rows && Array.isArray(table.rows)) {
        return table.rows;
      }

      // If it looks like a table object with common properties, don't try to iterate
      // This prevents trying to iterate over HTMLTableElement or other DOM objects
      const objectKeys = Object.keys(table);

      // If it has many properties or specific function keys, it's probably not data
      if (objectKeys.some(key => typeof table[key] === 'function')) {
        return [];
      }

      // Don't try to convert objects with prototype methods
      if (Object.getPrototypeOf(table) !== Object.prototype) {
        return [];
      }

      // It's a safe plain object, return empty (no iteration needed)
      return [];

    } catch (e) {
      return [];
    }
  }

  // Helper method to get table headers
  getTableHeaders(table: any): string[] {
    if (!table || !Array.isArray(table) || table.length === 0) return [];
    const firstRow = table[0];
    if (typeof firstRow === 'object' && !Array.isArray(firstRow)) {
      return Object.keys(firstRow);
    }
    if (Array.isArray(firstRow)) {
      return firstRow.map((_, i) => `Col ${i + 1}`);
    }
    return [];
  }

  // Parse markdown table and convert to HTML string
  parseMarkdownTableToHTML(tableText: string): string {
    if (!tableText || typeof tableText !== 'string') return '';

    // Handle escaped newlines from API (\n becomes actual newline)
    let processedText = tableText.replace(/\\n/g, '\n');

    const lines = processedText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('|'));

    if (lines.length < 3) return '';

    let html = '<table class="content-table">\n';

    // Parse header row
    const headers = lines[0]
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    // Add thead
    html += '  <thead>\n    <tr>\n';
    headers.forEach(header => {
      html += `      <th>${this.escapeHtml(header)}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';

    // Add tbody - skip separator row (line[1])
    html += '  <tbody>\n';
    for (let i = 2; i < lines.length; i++) {
      const cells = lines[i]
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);

      if (cells.length === headers.length) {
        html += '    <tr>\n';
        cells.forEach(cell => {
          html += `      <td>${this.escapeHtml(cell)}</td>\n`;
        });
        html += '    </tr>\n';
      }
    }
    html += '  </tbody>\n</table>';

    return html;
  }

  // Escape HTML special characters
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Check if text contains a table (handles escaped newlines)
  containsTable(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    // Process escaped newlines and check for table markers
    const processedText = text.replace(/\\n/g, '\n');
    // Check for | pipes indicating table rows
    const pipeCount = processedText.split('|').length - 1;
    return pipeCount >= 5; // At least header row + separator + 1 data row with pipes
  }

  // Alternative table detection method
  hasTableData(text: string): boolean {
    if (!text || typeof text !== 'string') return false;
    // Check for escaped table syntax
    return text.includes('\\n|') || text.includes('\n|');
  }

  // Parse description sections including tables and convert tables to HTML
  parseDescriptionWithTables(text: string): any[] {
    if (!text || typeof text !== 'string') return [];

    // Handle escaped newlines from API (\n becomes actual newline)
    let processedText = text.replace(/\\n/g, '\n');

    const sections: any[] = [];
    const lines = processedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length === 0) return [];

    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check for markdown header (###)
      if (line.startsWith('#')) {
        const headerLevel = line.match(/^#+/)?.[0].length ?? 0;
        const title = line.replace(/^#+\s*/, '');
        const section = {
          title,
          content: '',
          tableHtml: '',
          headerLevel
        };
        i++;

        // Collect content until next header or table
        const contentLines: string[] = [];
        while (i < lines.length && !lines[i].startsWith('#') && !lines[i].includes('|')) {
          contentLines.push(lines[i]);
          i++;
        }

        // Check if next is a table
        if (i < lines.length && lines[i].includes('|')) {
          section.content = contentLines.join('\n').trim();
          // Extract table
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].includes('|')) {
            tableLines.push(lines[i]);
            i++;
          }
          section.tableHtml = this.parseMarkdownTableToHTML(tableLines.join('\n'));
        } else {
          section.content = contentLines.join('\n').trim();
        }

        sections.push(section);
      }
      // Check for bold header (**Title**)
      else if (line.match(/^\*\*[^*]+\*\*/) && !line.includes('|')) {
        const title = line.replace(/\*\*/g, '').trim();
        const section = {
          title,
          content: '',
          tableHtml: '',
          headerLevel: 3
        };
        i++;

        // Collect content until next header or table
        const contentLines: string[] = [];
        while (i < lines.length && !lines[i].startsWith('#') && !lines[i].match(/^\*\*/) && !lines[i].includes('|')) {
          contentLines.push(lines[i]);
          i++;
        }

        // Check if next is a table
        if (i < lines.length && lines[i].includes('|')) {
          section.content = contentLines.join('\n').trim();
          // Extract table
          const tableLines: string[] = [];
          while (i < lines.length && lines[i].includes('|')) {
            tableLines.push(lines[i]);
            i++;
          }
          section.tableHtml = this.parseMarkdownTableToHTML(tableLines.join('\n'));
        } else {
          section.content = contentLines.join('\n').trim();
        }

        sections.push(section);
      }
      // Check for table without header
      else if (line.includes('|')) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }

        const tableHtml = this.parseMarkdownTableToHTML(tableLines.join('\n'));
        if (tableHtml) {
          sections.push({
            title: '',
            content: '',
            tableHtml,
            headerLevel: 4
          });
        }
      }
      // Regular content
      else {
        const contentLines: string[] = [line];
        i++;
        while (i < lines.length && !lines[i].startsWith('#') && !lines[i].match(/^\*\*/) && !lines[i].includes('|')) {
          contentLines.push(lines[i]);
          i++;
        }

        const content = contentLines.join('\n').trim();
        if (content) {
          sections.push({
            title: '',
            content,
            tableHtml: '',
            headerLevel: 0
          });
        }
      }
    }

    return sections;
  }

  protected readonly Object = Object;
}
