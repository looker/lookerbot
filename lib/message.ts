export type FormattedMessage = string;

export type Message = FormattedMessage | IRichMessage;

export type SentMessage = IRichMessage & {
  channel: string;
  team: string;
  text: FormattedMessage;
  user: string;
};

export interface IRichMessage {
  attachments?: IAttachment[];
  text?: FormattedMessage;
}

export interface IAttachment {
  actions?: IAttachmentAction[];
  callback_id?: string;
  color?: string;
  fallback?: string;
  fields?: IAttachmentField[];
  image_url?: string;
  mrkdwn_in?: string[];
  text?: FormattedMessage;
  title?: string;
  title_link?: string;
}

export interface IAttachmentField {
  fallback: string;
  short: boolean;
  title: FormattedMessage;
  value: FormattedMessage;
}

export interface IAttachmentAction {
  name: string;
  text: string;
  type: "button";
  value: string;
}
