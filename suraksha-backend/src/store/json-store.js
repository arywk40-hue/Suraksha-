const fs = require('fs');
const path = require('path');

class JsonStore {
  constructor(dataFile, createInitialData, ensureDataShape) {
    this.dataFile = dataFile;
    this.createInitialData = createInitialData;
    this.ensureDataShape = ensureDataShape;
  }

  async read() {
    if (!fs.existsSync(this.dataFile)) {
      const initial = this.createInitialData();
      await this.write(initial);
      return initial;
    }

    try {
      return this.ensureDataShape(JSON.parse(fs.readFileSync(this.dataFile, 'utf8')));
    } catch (error) {
      const backupFile = `${this.dataFile}.corrupt-${Date.now()}`;
      fs.copyFileSync(this.dataFile, backupFile);
      const initial = this.createInitialData();
      await this.write(initial);
      throw new Error(`Data file was corrupt. Backed up to ${backupFile}`);
    }
  }

  async write(data) {
    fs.mkdirSync(path.dirname(this.dataFile), { recursive: true });
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }
}

module.exports = {
  JsonStore
};
