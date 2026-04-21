const express = require('express');
const path = require('path');
const { Logger } = require('./utils/logger');
const { Database } = require('./database/db');
const { ContentStrategyAgent } = require('./agents/content-strategy-agent');
const { ScriptWriterAgent } = require('./agents/script-writer-agent');
const { SEOOptimizerAgent } = require('./agents/seo-optimizer-agent');
const chalk = require('chalk');

class YouTubeAutomationAgent {
  constructor() {
    this.logger = new Logger('MainAgent');
    this.db = null;
    this.agents = {};
    this.app = express();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log(chalk.cyan.bold('\n🎬 YouTube Automation Agent (Lite Mode)'));
      console.log(chalk.gray('─'.repeat(50)));
      
      // Initialize database
      this.logger.info('Initializing database...');
      this.db = new Database();
      await this.db.initialize();
      
      // ⚠️ SKIP credentials completely
      console.log(chalk.yellow('⚠️ Skipping credentials (Lite Mode Enabled)'));

      // Initialize only required agents
      this.logger.info('Initializing agents...');
      await this.initializeAgents();
      
      // Setup API
      this.setupAPI();

      this.isInitialized = true;
      this.logger.success('Agent initialized successfully!');
      
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize:', error);
      return false;
    }
  }

  async initializeAgents() {
    this.agents = {
      strategy: new ContentStrategyAgent(this.db, null),
      scriptWriter: new ScriptWriterAgent(this.db, null),
      seoOptimizer: new SEOOptimizerAgent(this.db, null)
    };

    for (const [name, agent] of Object.entries(this.agents)) {
      await agent.initialize();
      this.logger.info(`✓ ${name} agent initialized`);
    }
  }

  setupAPI() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'dashboard')));
    
    // Home
    this.app.get('/', (req, res) => {
      res.send('🚀 YouTube Automation Agent is running');
    });
    
    // Health
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        initialized: this.isInitialized,
        timestamp: new Date().toISOString()
      });
    });

    // 🔥 MAIN ENDPOINT (important)
    this.app.post('/generate', async (req, res) => {
      try {
        const { topic, style } = req.body;
        const result = await this.generateContent(topic, style);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });
  }

  async generateContent(topic = 'motivation', style = 'short') {
    this.logger.info('Generating content...');

    const strategy = await this.agents.strategy.generateContentStrategy(topic);
    const script = await this.agents.scriptWriter.generateScript(strategy);
    const seoData = await this.agents.seoOptimizer.optimize(script, strategy);

    return {
      topic,
      title: script.title,
      script: script.content,
      hooks: seoData?.hooks || [],
      hashtags: seoData?.hashtags || []
    };
  }

  async start() {
    const initialized = await this.initialize();
    
    if (!initialized) {
      console.log(chalk.red('\n❌ Failed to initialize.'));
      process.exit(1);
    }
    
    // ✅ IMPORTANT FOR RENDER
    const PORT = process.env.PORT || 10000;

    this.app.listen(PORT, () => {
      console.log(chalk.green(`\n✅ Server running on port ${PORT}`));
    });
  }
}

// Start app
if (require.main === module) {
  const agent = new YouTubeAutomationAgent();
  agent.start().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

module.exports = { YouTubeAutomationAgent };
