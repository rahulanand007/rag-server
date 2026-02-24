import { Body, Controller, Post } from '@nestjs/common';
import { QueryService } from './query.service';

type AskBody = {
  question: string;
  source?: string;
  topK?: number;
};

@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('ask')
  async ask(@Body() body: AskBody) {
    return this.queryService.ask(body);
  }
}
