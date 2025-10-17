<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\ResourceCollection;

class BalanceTransactionCollection extends ResourceCollection
{
    public function toArray($request): array
    {
        return [
            'data' => BalanceTransactionResource::collection($this->collection),
            'meta' => [
                'count' => $this->collection->count(),
            ],
        ];
    }
}
