import { GraphQLClient } from 'graphql-request';
import { GraphQLResponse } from './types';

export class GitHubClient {
  private client: GraphQLClient;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.client = new GraphQLClient('https://api.github.com/graphql', {
      headers: {
        authorization: `Bearer ${token}`,
        'User-Agent': 'Obsidian-GitHub-Discussions/1.0.0'
      }
    });
  }

  async query<T>(query: string, variables?: any): Promise<T> {
    try {
      const response = await this.client.request<T>(query, variables);
      return response;
    } catch (error) {
      console.error('GraphQL query error:', error);
      throw new Error(`GitHub API request failed: ${error.message}`);
    }
  }

  async mutation<T>(mutation: string, variables?: any): Promise<T> {
    try {
      console.log('Executing GraphQL mutation:', {
        mutation: mutation.split('\n')[1]?.trim(), // First line with mutation name
        variables
      });
      
      const response = await this.client.request<T>(mutation, variables);
      console.log('GraphQL mutation successful');
      return response;
    } catch (error: any) {
      console.error('GraphQL mutation error:', error);
      
      // Enhanced error information
      if (error.response?.errors) {
        const errorMessages = error.response.errors.map((err: any) => err.message).join(', ');
        throw new Error(`GitHub API mutation failed: ${errorMessages}`);
      }
      
      throw new Error(`GitHub API mutation failed: ${error.message || String(error)}`);
    }
  }

  updateToken(token: string) {
    this.token = token;
    this.client = new GraphQLClient('https://api.github.com/graphql', {
      headers: {
        authorization: `Bearer ${token}`,
        'User-Agent': 'Obsidian-GitHub-Discussions/1.0.0'
      }
    });
  }

  isConfigured(): boolean {
    return !!this.token;
  }
}