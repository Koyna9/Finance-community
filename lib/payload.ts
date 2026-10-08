// One shared Payload client. getPayload() caches the instance, so calling this often is cheap.
import config from "@payload-config";
import { getPayload } from "payload";

export async function payloadClient() {
	return getPayload({ config });
}
